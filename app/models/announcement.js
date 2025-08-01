const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date }
});

const announcementSchema = new mongoose.Schema({
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['main', 'session', 'training'], 
    default: 'main',
    required: true
  },
  title: { 
    type: String, 
    required: true, 
    maxlength: 200,
    trim: true
  },
  content: { 
    type: String, 
    required: true, 
    maxlength: 5000,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  startTime: { type: Date },
  endTime: { type: Date },
  reactions: [reactionSchema],
  comments: [commentSchema],
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better query performance
announcementSchema.index({ community: 1, type: 1, createdAt: -1 });
announcementSchema.index({ community: 1, isActive: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ creator: 1, createdAt: -1 });

// Pre-save middleware to update the updatedAt field
announcementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if announcement is expired
announcementSchema.virtual('isExpired').get(function() {
  if (!this.endTime) return false;
  return new Date() > this.endTime;
});

// Virtual for checking if announcement is scheduled
announcementSchema.virtual('isScheduled').get(function() {
  if (!this.startTime) return false;
  return new Date() < this.startTime;
});

// Method to add a reaction
announcementSchema.methods.addReaction = function(userId, emoji) {
  // Add new reaction (toggle logic is handled in the route)
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

// Method to remove a reaction
announcementSchema.methods.removeReaction = function(userId, emoji = null) {
  if (emoji) {
    // Remove specific emoji reaction from this user
    this.reactions = this.reactions.filter(r => 
      !(r.user.toString() === userId.toString() && r.emoji === emoji)
    );
  } else {
    // Remove all reactions from this user (for backward compatibility)
    this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  }
  return this.save();
};

// Method to add a comment
announcementSchema.methods.addComment = function(userId, content) {
  this.comments.push({ user: userId, content });
  return this.save();
};

// Method to edit a comment
announcementSchema.methods.editComment = function(commentId, userId, newContent) {
  const comment = this.comments.id(commentId);
  if (comment && comment.user.toString() === userId.toString()) {
    comment.content = newContent;
    comment.edited = true;
    comment.editedAt = new Date();
    return this.save();
  }
  throw new Error('Comment not found or user not authorized');
};

// Method to delete a comment
announcementSchema.methods.deleteComment = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (comment && comment.user.toString() === userId.toString()) {
    comment.remove();
    return this.save();
  }
  throw new Error('Comment not found or user not authorized');
};

// Method to increment view count
announcementSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to serialize announcement for API response
announcementSchema.methods.toAPIResponse = function() {
  const announcement = this.toObject();
  
  // Handle creator population
  if (announcement.creator && announcement.creator.user) {
    announcement.creator = {
      _id: announcement.creator._id,
      username: announcement.creator.user.username,
      profilePicture: announcement.creator.user.profilePicture
    };
  }
  
  // Handle reactions population
  if (announcement.reactions) {
    announcement.reactions = announcement.reactions.map(reaction => ({
      _id: reaction._id,
      emoji: reaction.emoji,
      timestamp: reaction.timestamp,
      user: reaction.user && reaction.user.user ? {
        _id: reaction.user._id,
        username: reaction.user.user.username,
        profilePicture: reaction.user.user.profilePicture
      } : reaction.user
    }));
  }
  
  // Handle comments population
  if (announcement.comments) {
    announcement.comments = announcement.comments.map(comment => ({
      _id: comment._id,
      content: comment.content,
      timestamp: comment.timestamp,
      edited: comment.edited,
      editedAt: comment.editedAt,
      user: comment.user && comment.user.user ? {
        _id: comment.user._id,
        username: comment.user.user.username,
        profilePicture: comment.user.user.profilePicture
      } : comment.user
    }));
  }
  
  return announcement;
};

// Static method to get active announcements for a community
announcementSchema.statics.getActiveAnnouncements = function(communityId, type = null) {
  const query = { 
    community: communityId, 
    isActive: true,
    $or: [
      { endTime: { $exists: false } },
      { endTime: { $gt: new Date() } }
    ]
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('creator', 'user.username user.profilePicture')
    .populate('reactions.user', 'user.username user.profilePicture')
    .populate('comments.user', 'user.username user.profilePicture')
    .lean(); // Use lean() for better performance
};

module.exports = mongoose.model('Announcement', announcementSchema); 