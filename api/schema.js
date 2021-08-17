const mongoose = require('mongoose')

const txSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    default: 'watched'
  },
  network: {
    type: String,
    required: true,
    enum: ['goerli']
  },
  type: {
    type: String,
    required: true,
    default: 'other'
  },
  from: String,
  to: String,
  oldHash: String,
  newHash: String,
  timestamp: {
    type: String,
    default: Date.now(),
    required: true
  }
})

module.exports = mongoose.model('Transaction', txSchema)
