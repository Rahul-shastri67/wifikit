const mongoose = require('mongoose')

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600
  }
})

module.exports = mongoose.model('Session', sessionSchema)
