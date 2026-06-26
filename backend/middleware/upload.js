const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Blocked MIME types for security
const BLOCKED_MIME_TYPES = [
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'application/x-msdownload',
  'text/x-shellscript',
];

// Blocked extensions
const BLOCKED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.com', '.vbs', '.js', '.php', '.py', '.rb', '.pl'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const storedName = generateStoredFilename(file.originalname);
    cb(null, storedName);
  },
});

const fileFilter = (req, file, cb) => {
  // Check blocked MIME types
  if (BLOCKED_MIME_TYPES.includes(file.mimetype)) {
    logger.warn(`Blocked upload attempt: MIME type ${file.mimetype} by user ${req.user?._id}`);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'File type not allowed'));
  }

  // Check blocked extensions
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    logger.warn(`Blocked upload attempt: extension ${ext} by user ${req.user?._id}`);
    return cb(new Error('File extension not allowed for security reasons'));
  }

  // Path traversal prevention
  const sanitizedName = path.basename(file.originalname);
  if (sanitizedName !== file.originalname && file.originalname.includes('..')) {
    return cb(new Error('Invalid filename'));
  }

  cb(null, true);
};

const createUploadMiddleware = (req, res, next) => {
  const isAdmin = req.user?.role === 'admin';
  const maxSize = isAdmin
    ? Infinity
    : parseInt(process.env.MAX_FILE_SIZE_USER) || 524288000; // 500MB default

  const upload = multer({
    storage,
    fileFilter,
    limits: isAdmin ? {} : { fileSize: maxSize },
  }).single('file');

  upload(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = { createUploadMiddleware, UPLOADS_DIR };
