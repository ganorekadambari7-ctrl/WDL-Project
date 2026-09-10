const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('salary-pro-token');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) })
};

export const employeeApi = {
  list: () => request('/employees'),
  create: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/employees/${id}`, { method: 'DELETE' })
};

export const attendanceApi = {
  mark: (body) => request('/attendance', { method: 'POST', body: JSON.stringify(body) }),
  getByEmployee: (employeeId, month) => request(`/attendance/${employeeId}?month=${month}`)
};

export const leaveApi = {
  list: () => request('/leave'),
  apply: (body) => request('/leave', { method: 'POST', body: JSON.stringify(body) }),
  review: (id, status) => request(`/leave/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
};

export const salaryApi = {
  calculate: (body) => request('/salary/calculate', { method: 'POST', body: JSON.stringify(body) }),
  getByEmployee: (employeeId) => request(`/salary/${employeeId}`)
};

export const settingsApi = {
  updateProfile: (body) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/settings/password', { method: 'PUT', body: JSON.stringify(body) }),
  removeProfilePicture: () => request('/settings/profile-picture', { method: 'DELETE' }),
  users: () => request('/settings/users'),
  updateRole: (id, role) => request(`/settings/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
};

export const insightsApi = { get: () => request('/insights') };
