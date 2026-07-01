import api from './axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const videosAPI = {
  upload: (formData, onProgress) =>
    api.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          onProgress(percent);
        }
      },
    }),

  getAllVideos: (params) => api.get('/videos', { params }),
  deleteVideo: (id) => api.delete(`/videos/${id}`),

  // A native <video> element loads its `src` directly and can't send an
  // Authorization header, so we first mint a short-lived token scoped to
  // just this one video (never the user's real access token) and build
  // the stream URL with it.
  getStreamToken: (id) => api.get(`/videos/${id}/stream-token`),
  buildStreamUrl: (id, streamToken) =>
    `${API_BASE_URL}/videos/${id}/stream?token=${encodeURIComponent(streamToken)}`,
};
