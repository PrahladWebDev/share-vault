const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true, trim: true },
    storedName:   { type: String, required: true, unique: true },
    path:         { type: String, required: true },
    mimeType:     { type: String, required: true },
    size:         { type: Number, required: true, min: 0 },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', videoSchema);
