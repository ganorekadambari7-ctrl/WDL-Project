import os
import sys
import time
import subprocess
import requests
import pytest
import pymongo

TEST_PORT = 5001
TEST_BASE_URL = f"http://127.0.0.1:{TEST_PORT}"
TEST_MONGO_URI = "mongodb://127.0.0.1:27017/salary-pro-test"

@pytest.fixture(scope="session")
def mongo_client():
    client = pymongo.MongoClient(TEST_MONGO_URI, serverSelectionTimeoutMS=2000)
    # Verify connection
    client.admin.command('ping')
    yield client
    client.close()

@pytest.fixture(scope="session")
def test_db(mongo_client):
    db = mongo_client["salary-pro-test"]
    yield db

@pytest.fixture(scope="session", autouse=True)
def test_server(test_db):
    """
    Spawns an isolated Node.js test server running strictly on PORT=5001
    and connected to MONGODB_URI=mongodb://127.0.0.1:27017/salary-pro-test.
    Guarantees 100% isolation from the main production database.
    """
    # Clean test DB before server starts
    for collection_name in test_db.list_collection_names():
        test_db[collection_name].delete_many({})

    env = os.environ.copy()
    env["PORT"] = str(TEST_PORT)
    env["MONGODB_URI"] = TEST_MONGO_URI
    env["JWT_SECRET"] = "isolated_test_jwt_secret_998877"

    server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))

    # Write stderr to a temp log file to avoid Windows pipe-buffer deadlock.
    # stdout is discarded (Node only emits informational startup lines).
    stderr_log_path = os.path.join(os.path.dirname(__file__), "_node_server_stderr.log")
    stderr_log = open(stderr_log_path, "w")

    server_process = subprocess.Popen(
        ["node", "src/server.js"],
        cwd=server_dir,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=stderr_log,
    )

    # Wait up to 20 seconds for the server to become healthy on PORT 5001
    healthy = False
    start_time = time.time()
    while time.time() - start_time < 20:
        try:
            resp = requests.get(f"{TEST_BASE_URL}/api/health", timeout=1)
            if resp.status_code == 200 and resp.json().get("status") == "ok":
                healthy = True
                break
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.5)

    if not healthy:
        server_process.kill()
        server_process.wait()
        stderr_log.close()
        err_text = open(stderr_log_path).read()
        pytest.fail(f"Test server failed to start on port {TEST_PORT}:\n{err_text}")

    yield TEST_BASE_URL

    # Teardown: terminate test server & clean test DB
    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
        server_process.wait()

    stderr_log.close()

    for collection_name in test_db.list_collection_names():
        test_db[collection_name].delete_many({})

@pytest.fixture
def auth_api_client(test_server):
    class APIClient:
        def __init__(self, base_url):
            self.base_url = base_url

        def post(self, path, json=None, headers=None):
            return requests.post(f"{self.base_url}{path}", json=json, headers=headers or {})

        def get(self, path, headers=None, params=None):
            return requests.get(f"{self.base_url}{path}", headers=headers or {}, params=params)

        def put(self, path, json=None, headers=None):
            return requests.put(f"{self.base_url}{path}", json=json, headers=headers or {})

        def delete(self, path, headers=None):
            return requests.delete(f"{self.base_url}{path}", headers=headers or {})

    return APIClient(test_server)


# ---------------------------------------------------------------------------
# White-Box bridge fixtures (PORT 5002)
# ---------------------------------------------------------------------------

WB_BRIDGE_PORT = 5002
WB_BRIDGE_URL  = f"http://127.0.0.1:{WB_BRIDGE_PORT}"

# Path to the bridge script — lives inside server/ so Node resolves server/node_modules
_BRIDGE_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server", "wb_bridge.js"))
# Must run from the server directory (same dir as the script)
_SERVER_DIR    = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server"))

@pytest.fixture(scope="session")
def wb_bridge_server(test_db):
    """
    Starts server/wb_bridge.js on PORT 5002 using the server's node_modules.
    The bridge directly imports and mounts Salary Pro's REAL controllers
    (authController.js) and middleware (auth.js).

    Guarantees isolation: connects strictly to MONGODB_URI=salary-pro-test.
    """
    env = os.environ.copy()
    env["WB_PORT"]     = str(WB_BRIDGE_PORT)
    env["JWT_SECRET"]  = "isolated_test_jwt_secret_998877"
    env["MONGODB_URI"] = TEST_MONGO_URI

    stderr_log_path = os.path.join(os.path.dirname(__file__), "_wb_bridge_stderr.log")
    stderr_log = open(stderr_log_path, "w")

    bridge_process = subprocess.Popen(
        ["node", _BRIDGE_SCRIPT],
        cwd=_SERVER_DIR,          # run inside server/ so node_modules are resolved
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=stderr_log,
    )

    # Wait up to 15 seconds for the bridge to become healthy
    healthy = False
    start_time = time.time()
    while time.time() - start_time < 15:
        try:
            resp = requests.get(f"{WB_BRIDGE_URL}/wb/health", timeout=1)
            if resp.status_code == 200 and resp.json().get("status") == "ok":
                healthy = True
                break
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.5)

    if not healthy:
        bridge_process.kill()
        bridge_process.wait()
        stderr_log.close()
        err_text = open(stderr_log_path).read()
        pytest.fail(f"WB bridge failed to start on port {WB_BRIDGE_PORT}:\n{err_text}")

    yield WB_BRIDGE_URL

    bridge_process.terminate()
    try:
        bridge_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        bridge_process.kill()
        bridge_process.wait()

    stderr_log.close()


@pytest.fixture
def wb_client(wb_bridge_server):
    """HTTP client pointed at the White-Box bridge (port 5002)."""
    class APIClient:
        def __init__(self, base_url):
            self.base_url = base_url

        def post(self, path, json=None, headers=None):
            return requests.post(f"{self.base_url}{path}", json=json, headers=headers or {})

        def get(self, path, headers=None, params=None):
            return requests.get(f"{self.base_url}{path}", headers=headers or {}, params=params)

        def put(self, path, json=None, headers=None):
            return requests.put(f"{self.base_url}{path}", json=json, headers=headers or {})

        def delete(self, path, headers=None):
            return requests.delete(f"{self.base_url}{path}", headers=headers or {})

    return APIClient(wb_bridge_server)

