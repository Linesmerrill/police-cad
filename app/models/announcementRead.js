const mongoose = require('mongoose');

const announcementReadSchema = new mongoose.Schema({
  announcement: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, default: Date.now }
});

// Compound index for fast lookups - each user can only have one read record per announcement
announcementReadSchema.index({ announcement: 1, user: 1 }, { unique: true });

// Index for querying all announcements read by a user (useful for bulk checks)
announcementReadSchema.index({ user: 1, announcement: 1 });

module.exports = mongoose.model('AnnouncementRead', announcementReadSchema);
