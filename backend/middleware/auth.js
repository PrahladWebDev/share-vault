const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Access token expired');
      }
      return ApiResponse.unauthorized(res, 'Invalid access token');
    }

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return ApiResponse.unauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return ApiResponse.error(res, 'Authentication failed', 500);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }
    next();
  };
};

const adminOnly = authorize('admin');
const userOrAdmin = authorize('user', 'admin');

module.exports = { authenticate, authorize, adminOnly, userOrAdmin };
