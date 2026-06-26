const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?._id,
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.error(res, 'Validation failed', statusCode, errors);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return ApiResponse.error(res, message, statusCode);
  }

  // Mongoose Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
    return ApiResponse.error(res, message, statusCode);
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    return ApiResponse.error(res, message, statusCode);
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    return ApiResponse.error(res, message, statusCode);
  }

  // Multer Error
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File size exceeds the allowed limit';
    return ApiResponse.error(res, message, statusCode);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    return ApiResponse.error(res, message, statusCode);
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  return ApiResponse.error(res, message, statusCode);
};

const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.method} ${req.url} not found`);
};

module.exports = { errorHandler, notFoundHandler };
