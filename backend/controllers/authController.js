const { body } = require('express-validator');
const authService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  validate,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.registerUser(name, email, password);

  res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.prahladsingh.in' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    return ApiResponse.created(res, { user, accessToken }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

  res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.prahladsingh.in' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    return ApiResponse.success(res, { user, accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user._id);

 res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.prahladsingh.in' : undefined,
});
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return ApiResponse.unauthorized(res, 'Refresh token required');
    }

    const tokens = await authService.refreshAccessToken(token);

  res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.prahladsingh.in' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    return ApiResponse.success(res, { accessToken: tokens.accessToken }, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return ApiResponse.badRequest(res, 'Email is required');
    }

    const resetToken = await authService.generatePasswordResetToken(email);

    // In production, send email here
    // For now, return token in development only
    const responseData =
      process.env.NODE_ENV === 'development' && resetToken ? { resetToken } : null;

    logger.info(`Password reset requested for: ${email}`);

    return ApiResponse.success(
      res,
      responseData,
      'If an account exists with this email, a reset link has been sent'
    );
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return ApiResponse.badRequest(res, 'Token and new password are required');
    }

    if (password.length < 8) {
      return ApiResponse.badRequest(res, 'Password must be at least 8 characters');
    }

    await authService.resetPassword(token, password);
    return ApiResponse.success(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.badRequest(res, 'Current and new password are required');
    }

    if (newPassword.length < 8) {
      return ApiResponse.badRequest(res, 'New password must be at least 8 characters');
    }

    await authService.changePassword(req.user._id, currentPassword, newPassword);

   res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  domain: process.env.NODE_ENV === 'production' ? '.prahladsingh.in' : undefined,
});
    return ApiResponse.success(res, null, 'Password changed. Please login again');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'Profile fetched');
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  registerValidation,
  loginValidation,
};
