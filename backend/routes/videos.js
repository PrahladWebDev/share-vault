const express = require('express');
const router = express.Router();
const {
  createCollection,
  getAllCollections,
  deleteCollection,
  uploadVideo,
  getAllVideos,
  getStreamToken,
  streamVideo,
  deleteVideo,
} = require('../controllers/videoController');
const { authenticate, adminOnly } = require('../middleware/auth');
const { authenticateVideoStream } = require('../middleware/videoStreamAuth');
const { videoUploadMiddleware } = require('../middleware/videoUpload');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Stream route: scoped auth (header token OR a short-lived single-video
// token), since a native <video> element can't send an Authorization header.
router.get('/:id/stream', authenticateVideoStream, streamVideo);

// Everything else uses standard header-based admin auth.
router.use(authenticate, adminOnly);

// Collections (folders) that videos are organized into.
router.post('/collections', createCollection);
router.get('/collections', getAllCollections);
router.delete('/collections/:id', deleteCollection);

router.post('/upload', uploadLimiter, videoUploadMiddleware, uploadVideo);
router.get('/', getAllVideos);
router.get('/:id/stream-token', getStreamToken);
router.delete('/:id', deleteVideo);

module.exports = router;
