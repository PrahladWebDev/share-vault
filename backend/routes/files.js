const express = require('express');
const router = express.Router();
const {
  uploadFile,
  downloadFile,
  deleteFile,
  getMyFiles,
  generateShareLink,
  getFileInfo,
  getUserDashboard,
  checkUploadLimit,
} = require('../controllers/fileController');
const { authenticate, userOrAdmin } = require('../middleware/auth');
const { createUploadMiddleware } = require('../middleware/upload');
const { uploadLimiter, downloadLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/share/:token/info', getFileInfo);
router.get('/share/:token', downloadLimiter, downloadFile);

// Protected routes
router.use(authenticate);

router.post('/upload', uploadLimiter, createUploadMiddleware, uploadFile);
router.get('/my-files', getMyFiles);
router.delete('/:id', deleteFile);
router.post('/:id/share-link', generateShareLink);
router.get('/dashboard/stats', getUserDashboard);
router.get('/upload-limit', checkUploadLimit);

module.exports = router;
