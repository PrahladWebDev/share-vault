const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const logger = require('../utils/logger');

// Files land here after multer parses the multipart request. The request
// handler responds as soon as this is done — virus scanning and the MinIO
// push happen afterwards, in the background (see fileService.processUploadedFile),
// so a slow scan/storage push never blocks the HTTP response. Temp files are
// removed by that background step once it finishes (clean, rejected, or failed).
const TMP_DIR = process.env.TMP_UPLOAD_DIR || path.join(os.tmpdir(), 'sharevault-uploads');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const storedName = generateStoredFilename(file.originalname);
    cb(null, storedName);
  },
});

// All file types (.js, .exe, etc.) are accepted — safety comes from the
// virus scan below instead of an extension/MIME blocklist.
const fileFilter = (req, file, cb) => {
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
    if (err) return next(err);
    next();
  });
};

module.exports = { createUploadMiddleware, TMP_DIR };
