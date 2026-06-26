const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const File = require('../models/File');
const CleanupLog = require('../models/CleanupLog');
const { performFileDeletion } = require('../services/fileService');
const { runCleanup } = require('../services/cleanupService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { UPLOADS_DIR } = require('../middleware/upload');

const getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalUsers,
      totalFiles,
      uploadsToday,
      downloadStats,
      storageStats,
      expiredToday,
      recentUploads,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      File.countDocuments({ isExpired: false }),
      File.countDocuments({ uploadedAt: { $gte: todayStart } }),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
      CleanupLog.countDocuments({ deletedAt: { $gte: todayStart }, reason: 'expired' }),
      File.find({ isExpired: false })
        .sort({ uploadedAt: -1 })
        .limit(10)
        .populate('owner', 'name email')
        .lean(),
    ]);

    // Get disk usage
    let diskUsage = { total: 0, files: 0 };
    try {
      const uploadsPath = path.resolve(UPLOADS_DIR);
      if (fs.existsSync(uploadsPath)) {
        const files = fs.readdirSync(uploadsPath);
        diskUsage.files = files.length;
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(uploadsPath, file));
            diskUsage.total += stat.size;
          } catch {}
        }
      }
    } catch (err) {
      logger.warn('Could not read disk usage:', err.message);
    }

    return ApiResponse.success(
      res,
      {
        totalUsers,
        totalFiles,
        uploadsToday,
        totalDownloads: downloadStats[0]?.total || 0,
        storageUsed: storageStats[0]?.total || 0,
        diskUsage,
        expiredFilesDeletedToday: expiredToday,
        recentUploads,
      },
      'Admin dashboard data fetched'
    );
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    // Add file count per user
    const userIds = users.map((u) => u._id);
    const fileCounts = await File.aggregate([
      { $match: { owner: { $in: userIds }, isExpired: false } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
    ]);
    const fileCountMap = {};
    fileCounts.forEach((fc) => { fileCountMap[fc._id.toString()] = fc.count; });

    const usersWithFiles = users.map((u) => ({
      ...u,
      fileCount: fileCountMap[u._id.toString()] || 0,
    }));

    return ApiResponse.paginated(
      res,
      usersWithFiles,
      { page, limit, total, pages: Math.ceil(total / limit) },
      'Users fetched'
    );
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return ApiResponse.badRequest(res, 'Cannot delete your own account');
    }

    const user = await User.findById(id);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    // Delete all user's files
    const userFiles = await File.find({ owner: id, isExpired: false });
    for (const file of userFiles) {
      await performFileDeletion(file, 'manual_admin');
    }

    await User.findByIdAndDelete(id);
    logger.info(`Admin ${req.user._id} deleted user ${id}`);

    return ApiResponse.success(res, null, 'User and all their files deleted');
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`Admin toggled user ${id} status to ${user.isActive}`);
    return ApiResponse.success(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

const getAllFiles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = { isExpired: false };
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email')
        .lean(),
      File.countDocuments(query),
    ]);

    return ApiResponse.paginated(
      res,
      files,
      { page, limit, total, pages: Math.ceil(total / limit) },
      'Files fetched'
    );
  } catch (err) {
    next(err);
  }
};

const adminDeleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await File.findById(id);
    if (!file) return ApiResponse.notFound(res, 'File not found');

    await performFileDeletion(file, 'manual_admin');
    logger.info(`Admin ${req.user._id} deleted file ${id}`);
    return ApiResponse.success(res, null, 'File deleted');
  } catch (err) {
    next(err);
  }
};

const getCleanupLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      CleanupLog.find()
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      CleanupLog.countDocuments(),
    ]);

    return ApiResponse.paginated(
      res,
      logs,
      { page, limit, total, pages: Math.ceil(total / limit) },
      'Cleanup logs fetched'
    );
  } catch (err) {
    next(err);
  }
};

const triggerManualCleanup = async (req, res, next) => {
  try {
    logger.info(`Manual cleanup triggered by admin ${req.user._id}`);
    runCleanup().catch((err) => logger.error('Manual cleanup error:', err));
    return ApiResponse.success(res, null, 'Cleanup job triggered. Running in background.');
  } catch (err) {
    next(err);
  }
};

const getStorageStats = async (req, res, next) => {
  try {
    const stats = await File.aggregate([
      { $match: { isExpired: false } },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 },
          avgSize: { $avg: '$size' },
          maxSize: { $max: '$size' },
        },
      },
    ]);

    const byUser = await File.aggregate([
      { $match: { isExpired: false } },
      {
        $group: {
          _id: '$owner',
          totalSize: { $sum: '$size' },
          fileCount: { $sum: 1 },
        },
      },
      { $sort: { totalSize: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          totalSize: 1,
          fileCount: 1,
        },
      },
    ]);

    return ApiResponse.success(res, { summary: stats[0] || {}, topUsers: byUser }, 'Storage stats');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  deleteUser,
  toggleUserStatus,
  getAllFiles,
  adminDeleteFile,
  getCleanupLogs,
  triggerManualCleanup,
  getStorageStats,
};
