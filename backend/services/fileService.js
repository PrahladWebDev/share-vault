const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const User = require('../models/User');
const CleanupLog = require('../models/CleanupLog');
const { generateShareToken } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');
const { UPLOADS_DIR } = require('../middleware/upload');

const DAILY_UPLOAD_LIMIT = 2;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const checkUserUploadLimit = async (userId) => {
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_MS);
  const uploadCount = await File.countDocuments({
    owner: userId,
    uploadedAt: { $gte: windowStart },
    isAdminFile: false,
  });
  return {
    count: uploadCount,
    remaining: Math.max(0, DAILY_UPLOAD_LIMIT - uploadCount),
    limitReached: uploadCount >= DAILY_UPLOAD_LIMIT,
  };
};

const saveFileMetadata = async (fileData, userId, isAdmin) => {
  const expiresAt = isAdmin ? null : new Date(Date.now() + ROLLING_WINDOW_MS);

  const shareToken = await generateUniqueShareToken();

  const file = await File.create({
    owner: userId,
    originalName: fileData.originalname,
    storedName: fileData.filename,
    path: fileData.path,
    mimeType: fileData.mimetype,
    size: fileData.size,
    shareToken,
    expiresAt,
    isAdminFile: isAdmin,
    uploadedAt: new Date(),
  });

  // Update user storage usage
  await User.findByIdAndUpdate(userId, {
    $inc: { usedStorage: fileData.size },
  });

  logger.info(`File uploaded: ${fileData.filename} by user ${userId}, size: ${fileData.size}`);
  return file;
};

const generateUniqueShareToken = async () => {
  let token;
  let exists = true;
  while (exists) {
    token = generateShareToken();
    exists = await File.exists({ shareToken: token });
  }
  return token;
};

const getUserFiles = async (userId, page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  const query = { owner: userId, isExpired: false };

  if (search) {
    query.originalName = { $regex: search, $options: 'i' };
  }

  const [files, total] = await Promise.all([
    File.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    File.countDocuments(query),
  ]);

  return {
    files,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getFileByToken = async (shareToken) => {
  const file = await File.findOne({ shareToken, isExpired: false }).populate(
    'owner',
    'name email'
  );

  if (!file) return null;

  if (file.hasExpired()) {
    await markFileExpired(file);
    return null;
  }

  return file;
};

const incrementDownloadCount = async (fileId) => {
  await File.findByIdAndUpdate(fileId, { $inc: { downloadCount: 1 } });
};

const deleteFile = async (fileId, userId, isAdmin = false) => {
  const query = isAdmin ? { _id: fileId } : { _id: fileId, owner: userId };
  const file = await File.findOne(query);

  if (!file) {
    throw Object.assign(new Error('File not found or access denied'), { statusCode: 404 });
  }

  const reason = isAdmin ? 'manual_admin' : 'manual_user';
  await performFileDeletion(file, reason);

  logger.info(`File deleted: ${file.storedName} by ${isAdmin ? 'admin' : 'user'} ${userId}`);
  return file;
};

const performFileDeletion = async (file, reason) => {
  // Delete from filesystem
  let fsStatus = 'success';
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (err) {
    logger.error(`Failed to delete file from disk: ${file.path}`, err);
    fsStatus = 'partial';
  }

  // Update user storage
  await User.findByIdAndUpdate(file.owner, {
    $inc: { usedStorage: -Math.abs(file.size) },
  });

  // Create cleanup log
  await CleanupLog.create({
    fileId: file._id,
    userId: file.owner,
    originalName: file.originalName,
    storedName: file.storedName,
    fileSize: file.size,
    reason,
    status: fsStatus,
    deletedAt: new Date(),
  });

  // Delete MongoDB document
  await File.findByIdAndDelete(file._id);
};

const markFileExpired = async (file) => {
  await File.findByIdAndUpdate(file._id, { isExpired: true });
};

const generateNewShareLink = async (fileId, userId, isAdmin = false) => {
  const query = isAdmin ? { _id: fileId } : { _id: fileId, owner: userId };
  const file = await File.findOne(query);

  if (!file) {
    throw Object.assign(new Error('File not found'), { statusCode: 404 });
  }

  if (file.isExpired) {
    throw Object.assign(new Error('File has expired'), { statusCode: 410 });
  }

  const newToken = await generateUniqueShareToken();
  await File.findByIdAndUpdate(fileId, { shareToken: newToken });

  return newToken;
};

const getUserDashboardData = async (userId) => {
  const now = new Date();
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_MS);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [user, totalFiles, uploadsToday, uploadsInWindow, totalDownloads] = await Promise.all([
    User.findById(userId),
    File.countDocuments({ owner: userId, isExpired: false }),
    File.countDocuments({ owner: userId, uploadedAt: { $gte: todayStart } }),
    File.countDocuments({ owner: userId, uploadedAt: { $gte: windowStart }, isAdminFile: false }),
    File.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } },
    ]),
  ]);

  const recentFiles = await File.find({ owner: userId, isExpired: false })
    .sort({ uploadedAt: -1 })
    .limit(5)
    .lean();

  return {
    storageUsed: user.usedStorage,
    totalFiles,
    uploadsToday,
    remainingUploads: Math.max(0, DAILY_UPLOAD_LIMIT - uploadsInWindow),
    totalDownloads: totalDownloads[0]?.total || 0,
    recentFiles,
    activeShareLinks: recentFiles.filter((f) => f.shareToken).length,
  };
};

module.exports = {
  checkUserUploadLimit,
  saveFileMetadata,
  getUserFiles,
  getFileByToken,
  incrementDownloadCount,
  deleteFile,
  performFileDeletion,
  generateNewShareLink,
  getUserDashboardData,
};
