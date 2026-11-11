import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────
export const login          = (data)    => API.post('/auth/login', data);
export const register       = (data)    => API.post('/auth/register', data);
export const getMe          = ()        => API.get('/auth/me');
export const updateProfile  = (data)    => API.put('/auth/profile', data);
export const changePassword = (data)    => API.put('/auth/change-password', data);

// ── Dashboard ──────────────────────────────────────────────────
export const getDashboardSummary  = ()   => API.get('/dashboard/summary');
export const getAlertChart        = ()   => API.get('/dashboard/chart/alerts');
export const getDrowsinessChart   = ()   => API.get('/dashboard/chart/drowsiness');
export const getMapDrivers        = ()   => API.get('/dashboard/map');

// ── Drivers ────────────────────────────────────────────────────
export const getDrivers      = (params) => API.get('/drivers', { params });
export const getDriverStats  = ()       => API.get('/drivers/stats');
export const getDriver       = (id)     => API.get(`/drivers/${id}`);
export const createDriver    = (data)   => API.post('/drivers', data);
export const updateDriver    = (id, d)  => API.put(`/drivers/${id}`, d);
export const deleteDriver    = (id)     => API.delete(`/drivers/${id}`);
export const getDriverSensors= (id, p)  => API.get(`/drivers/${id}/sensors`, { params: p });
export const getDriverAlerts = (id)     => API.get(`/drivers/${id}/alerts`);

// ── Sensors ────────────────────────────────────────────────────
export const getLiveSensors   = ()      => API.get('/sensors/live');
export const getSensorHistory = (p)     => API.get('/sensors/history', { params: p });
export const getDriverChart   = (id, p) => API.get(`/sensors/chart/${id}`, { params: p });

// ── Alerts ─────────────────────────────────────────────────────
export const getAlerts        = (p)     => API.get('/alerts', { params: p });
export const getAlertCounts   = ()      => API.get('/alerts/counts');
export const acknowledgeAlert = (id)    => API.put(`/alerts/${id}/acknowledge`);
export const resolveAlert     = (id, d) => API.put(`/alerts/${id}/resolve`, d);
export const deleteAlert      = (id)    => API.delete(`/alerts/${id}`);

// ── Admin ──────────────────────────────────────────────────────
export const getAdminUsers    = ()      => API.get('/admin/users');
export const updateAdminUser  = (id, d) => API.put(`/admin/users/${id}`, d);
export const deleteAdminUser  = (id)    => API.delete(`/admin/users/${id}`);

export default API;
