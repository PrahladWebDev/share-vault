import api from './axios';

export const filesAPI = {
  upload: (formData, onProgress) =>
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          onProgress(percent);
        }
      },
    }),

  getMyFiles: (params) => api.get('/files/my-files', { params }),
  deleteFile: (id) => api.delete(`/files/${id}`),
  generateShareLink: (id) => api.post(`/files/${id}/share-link`),
  getFileInfo: (token) => api.get(`/files/share/${token}/info`),
  getDashboardStats: () => api.get('/files/dashboard/stats'),
  getUploadLimit: () => api.get('/files/upload-limit'),
};
