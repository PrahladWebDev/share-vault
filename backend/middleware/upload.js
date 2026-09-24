const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateStoredFilename } = require('../utils/tokenGenerator');
const { scanFile, isScanEnabled, isFailOpen } = require('../services/virusScanService');
const logger = require('../utils/logger');

// Files land here only briefly, in between multer parsing the multipart
// request and the service layer streaming them into MinIO — then they're
// deleted. This is NOT where files are permanently stored anymore.
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

const removeTempFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      logger.error(`Failed to remove temp upload ${filePath}:`, err);
    }
  });
};

// Runs after multer has written the file to TMP_DIR and before the
// controller pushes it to MinIO. Infected files never leave the temp dir.
const scanUploadedFile = async (req, res, next) => {
  if (!req.file || !isScanEnabled()) return next();

  const { path: tmpPath, originalname } = req.file;

  try {
    const result = await scanFile(tmpPath);

    if (!result.clean) {
      logger.warn(
        `Infected upload blocked: "${originalname}" (${result.signature}) by user ${req.user?._id}, ip ${req.ip}`
      );
      removeTempFile(tmpPath);
      const err = new Error(`Upload rejected: "${originalname}" contains malware (${result.signature})`);
      err.statusCode = 422;
      return next(err);
    }

    return next();
  } catch (scanErr) {
    logger.error(`Virus scan failed for "${originalname}" (${scanErr.code || 'ERR'}): ${scanErr.message}`);

    if (isFailOpen()) {
      logger.warn(`VIRUS_SCAN_FAIL_OPEN=true — allowing unscanned upload "${originalname}"`);
      return next();
    }

    removeTempFile(tmpPath);
    const tooBig = scanErr.code === 'SCAN_SIZE_LIMIT';
    const err = new Error(
      tooBig
        ? 'This file is too large for the virus scanner'
        : 'Virus scanner is temporarily unavailable. Please try again later.'
    );
    err.statusCode = tooBig ? 413 : 503;
    return next(err);
  }
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
    scanUploadedFile(req, res, next);
  });
};

module.exports = { createUploadMiddleware, TMP_DIR };
