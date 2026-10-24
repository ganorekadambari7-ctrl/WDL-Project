const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('salary-pro-token');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options
  });

  if (response.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('salary-pro-token');
    localStorage.removeItem('salary-pro-user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      window.location.href = '/login';
    }
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const err = new Error(data?.message || `Request failed with status ${response.status}.`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
};

export const employeeApi = {
  list: () => request('/employees'),
  me: () => request('/employees/me'),                                          // Employee self-view
  create: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
};

export const attendanceApi = {
  mark: (body) => request('/attendance', { method: 'POST', body: JSON.stringify(body) }),
  list: (month) => request(`/attendance${month ? `?month=${month}` : ''}`),
  getByEmployee: (employeeId, month) => request(`/attendance/${employeeId}${month ? `?month=${month}` : ''}`),
};

export const leaveApi = {
  list: (params) => {
    const q = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString() : '';
    return request(`/leave${q ? `?${q}` : ''}`);
  },
  apply: (body) => request('/leave', { method: 'POST', body: JSON.stringify(body) }),
  review: (id, payload) => {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    return request(`/leave/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
};

export const salaryApi = {
  calculate: (body) => request('/salary/calculate', { method: 'POST', body: JSON.stringify(body) }),
  getByEmployee: (employeeId) => request(`/salary/${employeeId}`),
};

export const settingsApi = {
  updateProfile: (body) => request('/settings/profile', { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/settings/password', { method: 'PUT', body: JSON.stringify(body) }),
  removeProfilePicture: () => request('/settings/profile-picture', { method: 'DELETE' }),
  users: () => request('/settings/users'),
  updateRole: (id, role) => request(`/settings/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  // Admin-only: explicitly link a User to an Employee record
  linkEmployee: (userId, employeeId) =>
    request(`/settings/users/${userId}/link-employee`, { method: 'PUT', body: JSON.stringify({ employeeId }) }),
};

export const promotionApi = {
  list: (employeeId) => request(`/promotions${employeeId ? `?employeeId=${employeeId}` : ''}`),
  getByEmployee: (employeeId) => request(`/promotions/history/${employeeId}`),
  getEligible: (employeeId) => request(`/promotions/eligible/${employeeId}`),
  promote: (body) => request('/promotions', { method: 'POST', body: JSON.stringify(body) }),
  designations: (dept) => request(`/promotions/designations${dept ? `?department=${encodeURIComponent(dept)}` : ''}`),
  createDesignation: (body) => request('/promotions/designations', { method: 'POST', body: JSON.stringify(body) }),
  updateDesignation: (id, body) => request(`/promotions/designations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getApplicableSalary: (employeeId, month) => request(`/promotions/applicable-rate/${employeeId}${month ? `?month=${month}` : ''}`),
};

export const departmentApi = {
  list: (all = false) => request(`/departments${all ? '?all=true' : ''}`),
  create: (body) => request('/departments', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/departments/${id}`, { method: 'DELETE' }),
};

export const courseApi = {
  list: (params) => {
    const q = params ? new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')).toString() : '';
    return request(`/courses${q ? `?${q}` : ''}`);
  },
  get: (id) => request(`/courses/${id}`),
  create: (body) => request('/courses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/courses/${id}`, { method: 'DELETE' }),
  verify: (id, body) => request(`/courses/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
};

export const notificationApi = {
  list: () => request('/notifications'),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
};

export const insightsApi = { get: () => request('/insights') };
