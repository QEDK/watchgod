require('dotenv').config()
const mongoose = require('mongoose')

const txSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    index: true,
    validate: (value) => {
      return /^0x([A-Fa-f0-9]{64})$/.test(value)
    }
  },
  status: {
    type: String,
    required: true,
    default: 'watched'
  },
  network: {
    type: String,
    required: true,
    enum: (process.env.APP_MODE == 'testnet') ? ['goerli'] : ['main', 'matic-main']
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
    type: Number,
    default: Date.now(),
    required: true
  }
})

module.exports = mongoose.model('Transaction', txSchema)
