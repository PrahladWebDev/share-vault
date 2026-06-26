const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
      unique: true,
    },
    path: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAdminFile: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ owner: 1, uploadedAt: -1 });
fileSchema.index({ shareToken: 1 });
fileSchema.index({ expiresAt: 1, isExpired: 1 });
fileSchema.index({ createdAt: -1 });

fileSchema.virtual('shareUrl').get(function () {
  return `${process.env.FRONTEND_URL}/share/${this.shareToken}`;
});

fileSchema.methods.isShareable = function () {
  return this.shareToken && !this.isExpired;
};

fileSchema.methods.hasExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('File', fileSchema);
