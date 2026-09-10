const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');

// Files land here only briefly, in between multer parsing the multipart
// request and the service layer streaming them into MinIO — then they're
// deleted. This is NOT where files are permanently stored anymore.
const TMP_DIR = process.env.TMP_UPLOAD_DIR || path.join(os.tmpdir(), 'sharevault-uploads');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
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
    cb(null, TMP_DIR);
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
    const err = new Error(`Files with a "${ext}" extension are not allowed for security reasons`);
    err.statusCode = 400;
    return cb(err);
  }

  // Path traversal prevention
  const sanitizedName = path.basename(file.originalname);
  if (sanitizedName !== file.originalname && file.originalname.includes('..')) {
    const err = new Error('Invalid filename');
    err.statusCode = 400;
    return cb(err);
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

module.exports = { createUploadMiddleware, TMP_DIR };
