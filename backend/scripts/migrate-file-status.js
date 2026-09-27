/**
 * One-time migration: backfill `status: 'ready'` on File documents that
 * predate the async-upload-processing change.
 *
 * Why this is needed:
 *   fileService.getFileByToken now filters on `status: 'ready'`. Files
 *   uploaded before this change have no `status` field in the stored
 *   document at all — not "processing", literally absent — so that query
 *   filter excludes them and every existing share/download link breaks
 *   until this runs.
 *
 * Safe to run multiple times (idempotent — only touches docs missing the
 * field). Does NOT touch isViewable/etc.; those were already computed
 * correctly for old uploads.
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/migrate-file-status.js
 * (or just `node scripts/migrate-file-status.js` if MONGODB_URI is already
 * set in your environment / .env, same as the app itself uses)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const File = require('../models/File');

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting — refusing to guess a connection string.');
    process.exit(1);
  }

  console.log(`Connecting to ${uri.replace(/\/\/.*@/, '//<credentials>@')}...`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const filter = { status: { $exists: false } };
  const matching = await File.countDocuments(filter);
  console.log(`Found ${matching} file(s) with no status field.`);

  if (matching === 0) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const result = await File.updateMany(filter, { $set: { status: 'ready' } });
  console.log(`Updated ${result.modifiedCount} document(s) to status: 'ready'.`);

  // Sanity check: confirm nothing is left unmigrated.
  const remaining = await File.countDocuments(filter);
  if (remaining > 0) {
    console.warn(`Warning: ${remaining} document(s) still missing status — investigate before deploying.`);
  } else {
    console.log('All existing files migrated successfully.');
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
