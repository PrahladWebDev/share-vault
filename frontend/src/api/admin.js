import api from './axios';

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  getAllFiles: (params) => api.get('/admin/files', { params }),
  deleteFile: (id) => api.delete(`/admin/files/${id}`),
  getCleanupLogs: (params) => api.get('/admin/cleanup-logs', { params }),
  triggerCleanup: () => api.post('/admin/cleanup/trigger'),
  getStorageStats: () => api.get('/admin/storage/stats'),
};
