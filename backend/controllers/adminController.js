const User = require('../models/User');
const File = require('../models/File');
const Video = require('../models/Video');
const CleanupLog = require('../models/CleanupLog');
const { performFileDeletion } = require('../services/fileService');
const { runCleanup } = require('../services/cleanupService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const getAdminDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));

    const [
      totalUsers,
      totalFiles,
      uploadsToday,
      videoUploadsToday,
      downloadStats,
      storageStats,
      videoStorageStats,
      expiredToday,
      recentFileUploads,
      recentVideoUploads,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      File.countDocuments({ isExpired: false }),
      File.countDocuments({ uploadedAt: { $gte: todayStart } }),
      Video.countDocuments({ uploadedAt: { $gte: todayStart } }),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
      File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
      Video.aggregate([{ $group: { _id: null, total: { $sum: '$size' }, count: { $sum: 1 } } }]),
      CleanupLog.countDocuments({ deletedAt: { $gte: todayStart }, reason: 'expired' }),
      File.find({ isExpired: false })
        .sort({ uploadedAt: -1 })
        .limit(10)
        .populate('owner', 'name email')
        .lean(),
      Video.find()
        .sort({ uploadedAt: -1 })
        .limit(10)
        .populate('uploadedBy', 'name email')
        .lean(),
    ]);

    const fileStorageTotal = storageStats[0]?.total || 0;
    const videoStorageTotal = videoStorageStats[0]?.total || 0;
    const videoCount = videoStorageStats[0]?.count || 0;

    // Merge recent files + recent videos into a single activity feed
    const recentUploads = [
      ...recentFileUploads.map((f) => ({ ...f, itemType: 'file' })),
      ...recentVideoUploads.map((v) => ({
        ...v,
        itemType: 'video',
        owner: v.uploadedBy,
        downloadCount: null,
      })),
    ]
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 10);

    // Storage usage now comes straight from MongoDB rather than scanning a
    // local uploads/videos directory — with MinIO the actual bytes live on
    // the object store, but we already track exact sizes/counts per file,
    // so there's no need to reach out to MinIO just to re-derive totals.
    const diskUsage = {
      total: fileStorageTotal + videoStorageTotal,
      files: totalFiles,
      videoFiles: videoCount,
    };

    return ApiResponse.success(
      res,
      {
        totalUsers,
        totalFiles: totalFiles + videoCount,
        uploadsToday: uploadsToday + videoUploadsToday,
        totalDownloads: downloadStats[0]?.total || 0,
        storageUsed: fileStorageTotal + videoStorageTotal,
        fileStorageUsed: fileStorageTotal,
        videoStorageUsed: videoStorageTotal,
        totalVideos: videoCount,
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

    const searchMatch = search
      ? { originalName: { $regex: search, $options: 'i' } }
      : {};

    // Regular uploads (File collection) and admin-uploaded videos (Video
    // collection) are stored separately, but the admin "All Files" view
    // should show both. $unionWith merges them into one sorted, paginated
    // list rather than the previous File-only query.
    const pipeline = [
      { $match: { isExpired: false, ...searchMatch } },
      { $addFields: { type: 'file', ownerId: '$owner' } },
      {
        $unionWith: {
          coll: 'videos',
          pipeline: [
            { $match: searchMatch },
            { $addFields: { type: 'video', ownerId: '$uploadedBy' } },
          ],
        },
      },
      { $sort: { uploadedAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'ownerId',
                foreignField: '_id',
                as: 'owner',
              },
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                originalName: 1,
                mimeType: 1,
                size: 1,
                uploadedAt: 1,
                downloadCount: 1,
                expiresAt: 1,
                isAdminFile: 1,
                type: 1,
                'owner._id': 1,
                'owner.name': 1,
                'owner.email': 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await File.aggregate(pipeline);
    const files = result.data;
    const total = result.totalCount[0]?.count || 0;

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
