const multer = require('multer');
const fs = require('fs');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');

const VIDEOS_DIR = process.env.VIDEOS_DIR || './videos';

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_DIR);
  },
  filename: (req, file, cb) => {
    const storedName = generateStoredFilename(file.originalname);
    cb(null, storedName);
  },
});

const videoFileFilter = (req, file, cb) => {
  // Only allow video mimetypes
  if (!file.mimetype.startsWith('video/')) {
    logger.warn(`Blocked video-vault upload attempt: MIME type ${file.mimetype} by user ${req.user?._id}`);
    const err = new Error('Only video files are allowed');
    err.statusCode = 400;
    return cb(err);
  }

  cb(null, true);
};

const videoUploadMiddleware = (req, res, next) => {
  const upload = multer({
    storage,
    fileFilter: videoFileFilter,
    limits: {}, // No size limit — admin only
  }).single('video');

  upload(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = { videoUploadMiddleware, VIDEOS_DIR };
