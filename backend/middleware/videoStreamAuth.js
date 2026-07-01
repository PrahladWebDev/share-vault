const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Authorizes GET /videos/:id/stream. Accepts either:
//  1) Authorization: Bearer <normal access token> (admin only) — for API/Postman use.
//  2) ?token=<short-lived, single-video stream token> — for the native <video>
//     element's `src`, which can't send an Authorization header. This token
//     is minted per-view by POST /videos/:id/stream-token, expires quickly,
//     and is only valid for that one video — so even if it leaks (e.g. via
//     access logs or browser history) it can't be used to hit the wider API.
const authenticateVideoStream = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (headerToken) {
      let decoded;
      try {
        decoded = jwt.verify(headerToken, process.env.JWT_SECRET);
      } catch (err) {
        return ApiResponse.unauthorized(res, 'Invalid or expired access token');
      }

      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (!user || !user.isActive) {
        return ApiResponse.unauthorized(res, 'User not found or inactive');
      }
      if (user.role !== 'admin') {
        return ApiResponse.forbidden(res, 'Admin access required');
      }

      req.user = user;
      return next();
    }

    const queryToken = req.query.token;
    if (!queryToken) {
      return ApiResponse.unauthorized(res, 'Stream token required');
    }

    let decoded;
    try {
      decoded = jwt.verify(queryToken, process.env.JWT_SECRET);
    } catch (err) {
      return ApiResponse.unauthorized(res, 'Stream link expired or invalid');
    }

    if (decoded.purpose !== 'video-stream' || decoded.videoId !== req.params.id) {
      return ApiResponse.forbidden(res, 'Token not valid for this video');
    }

    next();
  } catch (error) {
    logger.error('Video stream auth error:', error);
    return ApiResponse.error(res, 'Authentication failed', 500);
  }
};

module.exports = { authenticateVideoStream };
