const fs = require('fs');
const jwt = require('jsonwebtoken');
const Video = require('../models/Video');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const STREAM_TOKEN_EXPIRY = '30m';

const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No video file provided');
    }

    const video = await Video.create({
      uploadedBy: req.user._id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    });

    logger.info(`Video uploaded: ${req.file.filename} by admin ${req.user._id}, size: ${req.file.size}`);

    return ApiResponse.created(
      res,
      {
        video: {
          id: video._id,
          originalName: video.originalName,
          size: video.size,
          mimeType: video.mimeType,
          uploadedAt: video.uploadedAt,
        },
      },
      'Video uploaded successfully'
    );
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        logger.error('Failed to cleanup video after upload error:', unlinkErr);
      }
    }
    next(err);
  }
};

const getAllVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email')
        .lean(),
      Video.countDocuments(query),
    ]);

    return ApiResponse.paginated(
      res,
      videos,
      { page, limit, total, pages: Math.ceil(total / limit) },
      'Videos fetched'
    );
  } catch (err) {
    next(err);
  }
};

const getStreamToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return ApiResponse.notFound(res, 'Video not found');
    }

    const streamToken = jwt.sign(
      { videoId: id, purpose: 'video-stream' },
      process.env.JWT_SECRET,
      { expiresIn: STREAM_TOKEN_EXPIRY }
    );

    return ApiResponse.success(res, { streamToken }, 'Stream token issued');
  } catch (err) {
    next(err);
  }
};

const streamVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return ApiResponse.notFound(res, 'Video not found');
    }

    if (!fs.existsSync(video.path)) {
      logger.error(`Video missing from disk: ${video.path}`);
      return ApiResponse.error(res, 'Video not available on server', 500);
    }

    const stat = fs.statSync(video.path);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Support seeking / partial content for native video player controls
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set({ 'Content-Range': `bytes */${fileSize}` });
        return res.end();
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(video.path, { start, end });

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimeType || 'video/mp4',
      });

      stream.on('error', (err) => {
        logger.error(`Read stream error for video ${video._id}:`, err);
        if (!res.headersSent) {
          ApiResponse.error(res, 'Error reading video', 500);
        }
      });

      stream.pipe(res);
    } else {
      res.status(200).set({
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
      });

      const stream = fs.createReadStream(video.path);
      stream.on('error', (err) => {
        logger.error(`Read stream error for video ${video._id}:`, err);
        if (!res.headersSent) {
          ApiResponse.error(res, 'Error reading video', 500);
        }
      });
      stream.pipe(res);
    }
  } catch (err) {
    next(err);
  }
};

const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return ApiResponse.notFound(res, 'Video not found');
    }

    if (fs.existsSync(video.path)) {
      try {
        fs.unlinkSync(video.path);
      } catch (err) {
        logger.error(`Failed to delete video from disk: ${video.path}`, err);
      }
    }

    await Video.findByIdAndDelete(id);

    logger.info(`Video deleted: ${video.storedName} by admin ${req.user._id}`);
    return ApiResponse.success(res, null, 'Video deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadVideo,
  getAllVideos,
  getStreamToken,
  streamVideo,
  deleteVideo,
};
