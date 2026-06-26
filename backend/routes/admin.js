const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getAllUsers,
  deleteUser,
  toggleUserStatus,
  getAllFiles,
  adminDeleteFile,
  getCleanupLogs,
  triggerManualCleanup,
  getStorageStats,
} = require('../controllers/adminController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.use(authenticate, adminOnly);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.get('/files', getAllFiles);
router.delete('/files/:id', adminDeleteFile);
router.get('/cleanup-logs', getCleanupLogs);
router.post('/cleanup/trigger', triggerManualCleanup);
router.get('/storage/stats', getStorageStats);

module.exports = router;
