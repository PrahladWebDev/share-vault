const path = require('path');
const fs = require('fs');
const fileService = require('../services/fileService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No file provided');
    }

    const isAdmin = req.user.role === 'admin';

    // Check upload limit for regular users
    if (!isAdmin) {
      const { limitReached, remaining } = await fileService.checkUserUploadLimit(req.user._id);
      if (limitReached) {
        // Remove the uploaded file since we reject it
        fs.unlinkSync(req.file.path);
        return ApiResponse.error(
          res,
          'Daily upload limit reached. You can upload 2 files per 24-hour period.',
          429
        );
      }
    }

    const file = await fileService.saveFileMetadata(req.file, req.user._id, isAdmin);

    return ApiResponse.created(
      res,
      {
        file: {
          id: file._id,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          shareToken: file.shareToken,
          expiresAt: file.expiresAt,
          uploadedAt: file.uploadedAt,
          shareUrl: file.shareToken
            ? `${process.env.FRONTEND_URL}/share/${file.shareToken}`
            : null,
        },
      },
      'File uploaded successfully'
    );
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        logger.error('Failed to cleanup file after upload error:', unlinkErr);
      }
    }
    next(err);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const { token } = req.params;
    const file = await fileService.getFileByToken(token);

    if (!file) {
      return ApiResponse.notFound(res, 'File not found or link has expired');
    }

    if (!fs.existsSync(file.path)) {
      logger.error(`File missing from disk: ${file.path}`);
      return ApiResponse.error(res, 'File not available on server', 500);
    }

    await fileService.incrementDownloadCount(file._id);

    logger.info({
      event: 'download',
      fileId: file._id,
      shareToken: token,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const filename = encodeURIComponent(file.originalName);
    res.set({
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
      'Content-Length': file.size,
      'X-Content-Type-Options': 'nosniff',
    });

    const readStream = fs.createReadStream(file.path);
    readStream.on('error', (err) => {
      logger.error(`Read stream error for file ${file._id}:`, err);
      if (!res.headersSent) {
        ApiResponse.error(res, 'Error reading file', 500);
      }
    });

    readStream.pipe(res);
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    await fileService.deleteFile(id, req.user._id, isAdmin);
    return ApiResponse.success(res, null, 'File deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getMyFiles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const search = req.query.search || '';

    const result = await fileService.getUserFiles(req.user._id, page, limit, search);
    return ApiResponse.paginated(res, result.files, result.pagination, 'Files fetched');
  } catch (err) {
    next(err);
  }
};

const generateShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const newToken = await fileService.generateNewShareLink(id, req.user._id, isAdmin);
    const shareUrl = `${process.env.FRONTEND_URL}/share/${newToken}`;
    return ApiResponse.success(res, { shareToken: newToken, shareUrl }, 'Share link generated');
  } catch (err) {
    next(err);
  }
};

const getFileInfo = async (req, res, next) => {
  try {
    const { token } = req.params;
    const file = await fileService.getFileByToken(token);

    if (!file) {
      return ApiResponse.notFound(res, 'File not found or link has expired');
    }

    return ApiResponse.success(
      res,
      {
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        downloadCount: file.downloadCount,
        uploadedAt: file.uploadedAt,
        expiresAt: file.expiresAt,
        ownerName: file.owner?.name || 'Unknown',
      },
      'File info fetched'
    );
  } catch (err) {
    next(err);
  }
};

const getUserDashboard = async (req, res, next) => {
  try {
    const data = await fileService.getUserDashboardData(req.user._id);
    return ApiResponse.success(res, data, 'Dashboard data fetched');
  } catch (err) {
    next(err);
  }
};

const checkUploadLimit = async (req, res, next) => {
  try {
    const limitData = await fileService.checkUserUploadLimit(req.user._id);
    return ApiResponse.success(res, limitData, 'Upload limit status');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  getMyFiles,
  generateShareLink,
  getFileInfo,
  getUserDashboard,
  checkUploadLimit,
};
