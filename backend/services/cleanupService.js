const cron = require('node-cron');
const fs = require('fs');
const File = require('../models/File');
const User = require('../models/User');
const CleanupLog = require('../models/CleanupLog');
const logger = require('../utils/logger');

let isRunning = false;

const runCleanup = async () => {
  if (isRunning) {
    logger.warn('Cleanup already running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  logger.info('Starting cleanup job...');

  let deletedCount = 0;
  let failedCount = 0;
  let totalSizeReclaimed = 0;

  try {
    // Find all expired files that haven't been marked yet
    const expiredFiles = await File.find({
      isAdminFile: false,
      isExpired: false,
      expiresAt: { $lte: new Date() },
    }).populate('owner', '_id usedStorage');

    logger.info(`Found ${expiredFiles.length} expired files to clean up`);

    for (const file of expiredFiles) {
      try {
        // Delete physical file
        let fsDeleted = false;
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          fsDeleted = true;
        } else {
          logger.warn(`File not found on disk: ${file.path}`);
        }

        // Update user storage usage
        if (file.owner) {
          await User.findByIdAndUpdate(file.owner._id, {
            $inc: { usedStorage: -Math.abs(file.size) },
          });
        }

        // Create cleanup log
        await CleanupLog.create({
          fileId: file._id,
          userId: file.owner?._id,
          originalName: file.originalName,
          storedName: file.storedName,
          fileSize: file.size,
          reason: 'expired',
          status: fsDeleted ? 'success' : 'partial',
          deletedAt: new Date(),
          notes: fsDeleted ? null : 'File was not found on disk',
        });

        // Delete MongoDB document
        await File.findByIdAndDelete(file._id);

        totalSizeReclaimed += file.size;
        deletedCount++;
      } catch (fileErr) {
        failedCount++;
        logger.error(`Failed to clean up file ${file._id}: ${fileErr.message}`);

        // Mark as expired to prevent repeated attempts
        await File.findByIdAndUpdate(file._id, { isExpired: true });

        await CleanupLog.create({
          fileId: file._id,
          userId: file.owner?._id,
          originalName: file.originalName,
          storedName: file.storedName,
          fileSize: file.size,
          reason: 'cron_cleanup',
          status: 'failed',
          deletedAt: new Date(),
          notes: fileErr.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    const sizeInMB = (totalSizeReclaimed / (1024 * 1024)).toFixed(2);

    logger.info(
      `Cleanup completed: ${deletedCount} deleted, ${failedCount} failed, ` +
      `${sizeInMB} MB reclaimed in ${duration}ms`
    );
  } catch (err) {
    logger.error(`Cleanup job failed: ${err.message}`, { stack: err.stack });
  } finally {
    isRunning = false;
  }
};

const startCleanupJob = () => {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await runCleanup();
  });

  logger.info('Cleanup cron job scheduled: every 10 minutes');
};

module.exports = { startCleanupJob, runCleanup };
