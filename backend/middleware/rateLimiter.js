const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const createRateLimiter = (windowMs, max, message, options = {}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.error(res, message || 'Too many requests, please try again later', 429);
    },
    ...options,
  });
};

// The upload page polls GET /api/files/:id/status while a big file is being
// scanned/stored. That polling must not eat the global per-IP budget (it used
// to: a few minutes of polling = 429 on the next upload), so it is excluded
// here and covered by its own, much higher limiter below.
const isUploadStatusPoll = (req) =>
  req.method === 'GET' && /^\/api\/files\/[^/]+\/status\/?$/.test(req.path);

const globalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  'Too many requests from this IP, please try again in 15 minutes',
  { skip: isUploadStatusPoll }
);

const statusLimiter = createRateLimiter(
  15 * 60 * 1000,
  1000,
  'Too many status checks, please slow down and try again shortly'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts, please try again in 15 minutes'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  20,
  'Upload rate limit exceeded, please try again in 1 hour'
);

const downloadLimiter = createRateLimiter(
  15 * 60 * 1000,
  50,
  'Download rate limit exceeded, please try again in 15 minutes'
);

module.exports = {
  globalLimiter,
  statusLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
};
