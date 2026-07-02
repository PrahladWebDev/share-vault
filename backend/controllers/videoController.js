const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const Collection = require('../models/Collection');
const CleanupLog = require('../models/CleanupLog');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const STREAM_TOKEN_EXPIRY = '30m';

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const createCollection = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return ApiResponse.badRequest(res, 'Collection name is required');
    }

    const collection = await Collection.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user._id,
    });

    logger.info(`Collection created: ${collection.name} by admin ${req.user._id}`);

    return ApiResponse.created(res, { collection }, 'Collection created successfully');
  } catch (err) {
    next(err);
  }
};

const getAllCollections = async (req, res, next) => {
  try {
    const collections = await Collection.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'videos',
          localField: '_id',
          foreignField: 'collection',
          as: 'videos',
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
          videoCount: { $size: '$videos' },
          totalSize: { $sum: '$videos.size' },
        },
      },
    ]);

    return ApiResponse.success(res, { collections }, 'Collections fetched');
  } catch (err) {
    next(err);
  }
};

const deleteCollection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiResponse.badRequest(res, 'Invalid collection id');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      return ApiResponse.notFound(res, 'Collection not found');
    }

    const videoCount = await Video.countDocuments({ collection: id });
    if (videoCount > 0) {
      return ApiResponse.badRequest(
        res,
        'This collection still has videos in it. Delete or move those videos before deleting the collection.'
      );
    }

    await Collection.findByIdAndDelete(id);

    logger.info(`Collection deleted: ${collection.name} by admin ${req.user._id}`);
    return ApiResponse.success(res, null, 'Collection deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

const uploadVideo = async (req, res, next) => {
  const files = req.files || [];

  try {
    const { collectionId } = req.body;

    if (!files.length) {
      return ApiResponse.badRequest(res, 'No video file provided');
    }

    if (!collectionId || !mongoose.Types.ObjectId.isValid(collectionId)) {
      return ApiResponse.badRequest(res, 'A collection must be selected before uploading');
    }

    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return ApiResponse.badRequest(res, 'Selected collection does not exist');
    }

    const created = await Video.insertMany(
      files.map((file) => ({
        uploadedBy: req.user._id,
        collection: collection._id,
        originalName: file.originalname,
        storedName: file.filename,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      }))
    );

    logger.info(
      `${created.length} video(s) uploaded to collection ${collection._id} by admin ${req.user._id}`
    );

    return ApiResponse.created(
      res,
      {
        videos: created.map((video) => ({
          id: video._id,
          originalName: video.originalName,
          size: video.size,
          mimeType: video.mimeType,
          uploadedAt: video.uploadedAt,
          collection: video.collection,
        })),
      },
      `${created.length} video${created.length > 1 ? 's' : ''} uploaded successfully`
    );
  } catch (err) {
    // Clean up any files already written to disk if something failed mid-batch
    files.forEach((file) => {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          logger.error('Failed to cleanup video after upload error:', unlinkErr);
        }
      }
    });
    next(err);
  }
};

const getAllVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const search = req.query.search || '';
    const { collectionId } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }
    if (collectionId) {
      if (!mongoose.Types.ObjectId.isValid(collectionId)) {
        return ApiResponse.badRequest(res, 'Invalid collection id');
      }
      query.collection = collectionId;
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email')
        .populate('collection', 'name')
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

    let fsStatus = 'success';
    if (fs.existsSync(video.path)) {
      try {
        fs.unlinkSync(video.path);
      } catch (err) {
        logger.error(`Failed to delete video from disk: ${video.path}`, err);
        fsStatus = 'partial';
      }
    }

    await CleanupLog.create({
      fileId: video._id,
      userId: video.uploadedBy,
      originalName: video.originalName,
      storedName: video.storedName,
      fileSize: video.size,
      reason: 'manual_admin',
      status: fsStatus,
      deletedAt: new Date(),
    });

    await Video.findByIdAndDelete(id);

    logger.info(`Video deleted: ${video.storedName} by admin ${req.user._id}`);
    return ApiResponse.success(res, null, 'Video deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCollection,
  getAllCollections,
  deleteCollection,
  uploadVideo,
  getAllVideos,
  getStreamToken,
  streamVideo,
  deleteVideo,
};
