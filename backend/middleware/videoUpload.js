const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateStoredFilename } = require('../utils/tokenGenerator');

const VIDEO_UPLOADS_DIR = process.env.VIDEO_UPLOADS_DIR || './uploads/videos';

if (!fs.existsSync(VIDEO_UPLOADS_DIR)) {
  fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });
}

const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, generateStoredFilename(file.originalname)),
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
    return cb(new Error('Only video files are allowed'));
  }
  cb(null, true);
};

const videoUpload = multer({ storage, fileFilter }).single('video');

const videoUploadMiddleware = (req, res, next) => {
  videoUpload(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

module.exports = { videoUploadMiddleware, VIDEO_UPLOADS_DIR };
