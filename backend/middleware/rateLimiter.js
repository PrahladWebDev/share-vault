const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.error(res, message || 'Too many requests, please try again later', 429);
    },
  });
};

const globalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  'Too many requests from this IP, please try again in 15 minutes'
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
  authLimiter,
  uploadLimiter,
  downloadLimiter,
};
