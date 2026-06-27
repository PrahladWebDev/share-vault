const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    return null;
  }
};

const registerUser = async (name, email, password, role = 'user') => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const user = await User.create({ name, email, password, role });
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  await User.findByIdAndUpdate(user._id, { refreshToken });

  logger.info(`New user registered: ${email} (role: ${role})`);

  return { user, accessToken, refreshToken };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account has been deactivated'), { statusCode: 403 });
  }

  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  await User.findByIdAndUpdate(user._id, {
    refreshToken,
    lastLogin: new Date(),
  });

  logger.info(`User logged in: ${email}`);

  const safeUser = await User.findById(user._id);
  return { user: safeUser, accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);

  if (!decoded) {
    throw Object.assign(new Error('Invalid or expired refresh token'), {
      statusCode: 401,
    });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    throw Object.assign(new Error('Refresh token mismatch'), {
      statusCode: 401,
    });
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );

  return {
    accessToken,
    refreshToken: user.refreshToken,
  };
};

const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  logger.info(`User logged out: ${userId}`);
};

const generatePasswordResetToken = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal if email exists
    return null;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: hashedToken,
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return resetToken;
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info(`Password reset for user: ${user.email}`);
  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  user.password = newPassword;
  await user.save();

  // Invalidate all refresh tokens
  await User.findByIdAndUpdate(userId, { refreshToken: null });

  logger.info(`Password changed for user: ${userId}`);
};

module.exports = {
  generateTokens,
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  generatePasswordResetToken,
  resetPassword,
  changePassword,
};
