const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const generateShareToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

const generateStoredFilename = (originalName) => {
  const ext = originalName.includes('.')
    ? '.' + originalName.split('.').pop().toLowerCase()
    : '';
  const uniqueId = uuidv4().replace(/-/g, '').substring(0, 18);
  return `${uniqueId}${ext}`;
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

module.exports = {
  generateShareToken,
  generateStoredFilename,
  generateResetToken,
  generateRefreshToken,
};
