const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');

// Same idea as middleware/upload.js: temp landing spot only. Videos can be
// large with no size limit (admin-only), so we always stream file-to-file
// (temp disk -> MinIO) rather than buffering in memory.
const VIDEOS_TMP_DIR = process.env.VIDEOS_TMP_DIR || path.join(os.tmpdir(), 'sharevault-videos-tmp');
const MAX_FILES_PER_UPLOAD = 20;

if (!fs.existsSync(VIDEOS_TMP_DIR)) {
  fs.mkdirSync(VIDEOS_TMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEOS_TMP_DIR);
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

// Accepts multiple files in a single request under the "videos" field so an
// admin can upload several videos into a collection at once.
const videoUploadMiddleware = (req, res, next) => {
  const upload = multer({
    storage,
    fileFilter: videoFileFilter,
    limits: {}, // No size limit — admin only
  }).array('videos', MAX_FILES_PER_UPLOAD);

  upload(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = { videoUploadMiddleware, VIDEOS_TMP_DIR, MAX_FILES_PER_UPLOAD };
