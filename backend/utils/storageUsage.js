const User = require('../models/User');

/**
 * Give storage back to a user (file deleted / expired).
 *
 * Callers must only call this for files that were actually counted, i.e.
 * File.status === 'ready' (usedStorage is only incremented once a file has
 * been scanned and stored). Failed/rejected/processing files never added to
 * the counter, so subtracting them made usedStorage go negative.
 *
 * findByIdAndUpdate skips schema validators, so `min: 0` on the model does not
 * protect us — clamp explicitly as a safety net.
 */
const releaseUserStorage = async (userId, bytes) => {
  const amount = Math.abs(Number(bytes) || 0);
  if (!userId || !amount) return;

  await User.findByIdAndUpdate(userId, { $inc: { usedStorage: -amount } });
  await User.updateOne({ _id: userId, usedStorage: { $lt: 0 } }, { $set: { usedStorage: 0 } });
};

module.exports = { releaseUserStorage };
