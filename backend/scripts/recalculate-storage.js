/**
 * One-time repair: recompute every user's `usedStorage` from the files they
 * actually have.
 *
 * Why: earlier versions subtracted a file's size on delete/expiry even when
 * that file had never been counted (failed / rejected virus scans), which
 * pushed usedStorage below zero (the dashboard then showed "NaN undefined").
 *
 * The correct value is the total size of the user's File documents with
 * status 'ready' (videos are stored separately and added on the dashboard).
 *
 * DRY RUN by default — it only prints what it would change.
 *
 * Usage:
 *   node scripts/recalculate-storage.js           # preview
 *   node scripts/recalculate-storage.js --apply   # write the corrected values
 */

require('dotenv').config();
const mongoose = require('mongoose');
const File = require('../models/File');
const User = require('../models/User');

const APPLY = process.argv.includes('--apply');

const fmt = (bytes) => {
  const sign = bytes < 0 ? '-' : '';
  let n = Math.abs(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${sign}${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting — refusing to guess a connection string.');
    process.exit(1);
  }

  console.log(`Connecting to ${uri.replace(/\/\/.*@/, '//<credentials>@')}...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 });

  const totals = await File.aggregate([
    { $match: { status: 'ready' } },
    { $group: { _id: '$owner', total: { $sum: '$size' } } },
  ]);
  const expectedByUser = new Map(totals.map((t) => [String(t._id), t.total]));

  const users = await User.find({}, 'email usedStorage').lean();
  let changed = 0;

  for (const user of users) {
    const current = Number.isFinite(user.usedStorage) ? user.usedStorage : 0;
    const expected = expectedByUser.get(String(user._id)) || 0;
    if (current === expected) continue;

    changed += 1;
    console.log(`${user.email}: ${fmt(current)} -> ${fmt(expected)}`);
    if (APPLY) {
      await User.updateOne({ _id: user._id }, { $set: { usedStorage: expected } });
    }
  }

  console.log(
    changed === 0
      ? 'All users already correct. Nothing to do.'
      : APPLY
      ? `Updated ${changed} user(s).`
      : `${changed} user(s) would change. Re-run with --apply to write the corrected values.`
  );

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Recalculation failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
