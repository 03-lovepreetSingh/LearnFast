// scheduleSchema.js (in your Node.js backend)
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  duration: String,
  link: String,
  thumbnail: String,
  completed: { type: Boolean, default: false }
});

const dayScheduleSchema = new mongoose.Schema({
  day: String,
  date: Date,
  videos: [videoSchema]
});

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'Untitled Schedule'
  },
  playlist_url: {
    type: String,
    required: true
  },
  schedule_type: {
    type: String,
    enum: ['daily', 'target'],
    required: true
  },
  settings: {
    daily_hours: Number,
    target_days: Number
  },
  schedule_data: [dayScheduleSchema],
  summary: {
    totalVideos: Number,
    totalDays: Number,
    totalDuration: String,
    averageDailyDuration: String
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
scheduleSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;