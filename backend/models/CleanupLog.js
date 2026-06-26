const mongoose = require('mongoose');

const cleanupLogSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    originalName: {
      type: String,
    },
    storedName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      enum: ['expired', 'manual_user', 'manual_admin', 'cron_cleanup'],
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      default: 'success',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

cleanupLogSchema.index({ deletedAt: -1 });
cleanupLogSchema.index({ userId: 1 });
cleanupLogSchema.index({ reason: 1 });
cleanupLogSchema.index({ status: 1 });

module.exports = mongoose.model('CleanupLog', cleanupLogSchema);
