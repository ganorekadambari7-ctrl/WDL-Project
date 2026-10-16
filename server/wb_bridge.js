/**
 * Salary Pro — White-Box Test Bridge Adapter
 * ===========================================
 * Thin test adapter running on PORT 5002.
 * Directly imports and invokes Salary Pro's ACTUAL controller, middleware, and model logic:
 *   - authController.register (from src/controllers/authController.js)
 *   - authController.login    (from src/controllers/authController.js)
 *   - auth.protect            (from src/middleware/auth.js)
 *   - auth.authorize          (from src/middleware/auth.js)
 *   - employeeController.createEmployee (from src/controllers/employeeController.js)
 *   - attendanceController.markAttendance (from src/controllers/attendanceController.js)
 *   - attendanceController.getEmployeeAttendance (from src/controllers/attendanceController.js)
 *   - Employee model          (from src/models/Employee.js)
 *   - Attendance model        (from src/models/Attendance.js)
 *
 * Connects exclusively to the isolated test database (salary-pro-test).
 * Records exact function execution logs for white-box branch evidence.
 */

import express from 'express';
import mongoose from 'mongoose';
import { register, login } from './src/controllers/authController.js';
import { protect, authorize } from './src/middleware/auth.js';
import { createEmployee } from './src/controllers/employeeController.js';
import { markAttendance, getEmployeeAttendance } from './src/controllers/attendanceController.js';
import Employee from './src/models/Employee.js';
import Attendance from './src/models/Attendance.js';
import Leave from './src/models/Leave.js';
import Salary from './src/models/Salary.js';
import { applyLeave, reviewLeave, getLeaves } from './src/controllers/leaveController.js';
import { calculateSalary, getSalaries } from './src/controllers/salaryController.js';

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'isolated_test_jwt_secret_998877';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/salary-pro-test';

// Safety check: guarantee test database isolation
if (!MONGODB_URI.includes('test')) {
  console.error(`FATAL: White-Box bridge must connect to a test database. Provided: ${MONGODB_URI}`);
  process.exit(1);
}

// Connect to the isolated test database
await mongoose.connect(MONGODB_URI);
console.log(`WB Bridge connected to MongoDB: ${mongoose.connection.name}`);

// ── In-Memory Execution Tracker ──────────────────────────────────────────────
const executionLog = [];

export const recordExecution = (entry) => {
  executionLog.push({ ...entry, timestamp: Date.now() });
};

// ── Health & Diagnostics ─────────────────────────────────────────────────────
app.get('/wb/health', (_req, res) => {
  res.json({
    status: 'ok',
    bridge: 'whitebox_adapter',
    database: mongoose.connection.name,
    dbReady: mongoose.connection.readyState === 1,
  });
});

app.get('/wb/execution-log', (_req, res) => {
  res.json(executionLog);
});

app.post('/wb/clear-log', (_req, res) => {
  executionLog.length = 0;
  res.json({ cleared: true });
});

// ── WB01, WB02, WB03, WB04, WB07: Auth Controllers ──────────────────────────
app.post('/wb/controller/register', (req, res, next) => {
  recordExecution({
    function: 'authController.register',
    email: req.body?.email,
    username: req.body?.username,
    role: req.body?.role,
  });
  return register(req, res, next);
});

app.post('/wb/controller/login', (req, res, next) => {
  recordExecution({
    function: 'authController.login',
    email: req.body?.email,
    role: req.body?.role,
    providedPasswordLength: req.body?.password ? req.body.password.length : 0,
  });
  return login(req, res, next);
});

// ── WB05, WB06: Protect Middleware ───────────────────────────────────────────
app.get(
  '/wb/middleware/protect',
  (req, res, next) => {
    recordExecution({
      function: 'auth.protect',
      hasAuthHeader: Boolean(req.headers.authorization),
      tokenPrefix: req.headers.authorization?.slice(0, 15) || null,
    });
    return protect(req, res, next);
  },
  (req, res) => {
    recordExecution({
      function: 'auth.protect.next_called',
      resolvedUserId: req.user?._id?.toString(),
      resolvedRole: req.user?.role,
    });
    res.json({
      authenticated: true,
      message: 'Access granted by protect middleware',
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        name: req.user.name,
      },
    });
  }
);

// ── WB08: Role-based Authorization Middleware ────────────────────────────────
app.get(
  '/wb/middleware/authorize-admin',
  (req, res, next) => {
    recordExecution({ function: 'auth.protect' });
    return protect(req, res, next);
  },
  (req, res, next) => {
    recordExecution({ function: 'auth.authorize', role: req.user?.role });
    return authorize('admin')(req, res, next);
  },
  (req, res) => {
    recordExecution({ function: 'auth.authorize.next_called', role: req.user?.role });
    res.json({
      authorized: true,
      message: 'Admin authorization passed',
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  }
);

// ── WB09: Employee Controller & Schema Validation ────────────────────────────
app.post('/wb/controller/employee', (req, res, next) => {
  recordExecution({ function: 'employeeController.createEmployee', body: req.body });
  return createEmployee(req, res, next);
});

app.post('/wb/model/employee/validate', async (req, res) => {
  recordExecution({ function: 'Employee.schema.validate', body: req.body });
  try {
    const doc = new Employee(req.body);
    await doc.validate();
    res.json({ valid: true, doc });
  } catch (err) {
    res.status(422).json({
      valid: false,
      name: err.name,
      message: err.message,
      errors: Object.keys(err.errors || {}).reduce((acc, k) => {
        acc[k] = {
          kind: err.errors[k].kind,
          path: err.errors[k].path,
          message: err.errors[k].message,
          value: err.errors[k].value,
        };
        return acc;
      }, {}),
    });
  }
});

// ── WB10: Attendance Upsert Controller ───────────────────────────────────────
app.post('/wb/controller/attendance', (req, res, next) => {
  recordExecution({ function: 'attendanceController.markAttendance', body: req.body });
  return markAttendance(req, res, next);
});

app.get('/wb/controller/attendance/:employeeId', (req, res, next) => {
  recordExecution({
    function: 'attendanceController.getEmployeeAttendance',
    employeeId: req.params.employeeId,
    month: req.query.month,
  });
  return getEmployeeAttendance(req, res, next);
});

// ── WB11, WB12: Leave Review Controller ──────────────────────────────────────
app.post('/wb/controller/leave', (req, res, next) => {
  recordExecution({ function: 'leaveController.applyLeave', body: req.body });
  return applyLeave(req, res, next);
});

app.put('/wb/controller/leave/:id/review', (req, res, next) => {
  recordExecution({ function: 'auth.protect' });
  return protect(req, res, next);
}, (req, res, next) => {
  recordExecution({
    function: 'leaveController.reviewLeave',
    leaveId: req.params.id,
    status: req.body?.status,
    reviewerId: req.user?._id?.toString(),
  });
  return reviewLeave(req, res, next);
});

// ── WB13, WB14, WB15: Salary Calculation Controller ──────────────────────────
app.post('/wb/controller/salary/calculate', (req, res, next) => {
  recordExecution({ function: 'salaryController.calculateSalary', body: req.body });
  return calculateSalary(req, res, next);
});

app.get('/wb/controller/salary/:employeeId', (req, res, next) => {
  recordExecution({
    function: 'salaryController.getSalaries',
    employeeId: req.params.employeeId,
  });
  return getSalaries(req, res, next);
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('[WB Bridge Error]', err);
  res.status(500).json({ error: err.message });
});

const WB_PORT = parseInt(process.env.WB_PORT || '5002', 10);
app.listen(WB_PORT, () => {
  console.log(`WB bridge listening on port ${WB_PORT}`);
});
