require('dotenv').config()
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
    enum: (process.env.APP_MODE === 'testnet') ? ['goerli'] : ['main', 'matic-main']
  },
  txType: {
    type: String,
    required: true,
    default: 'other'
  },
  prevBurnHash: String,
  from: String,
  to: String,
  data: String,
  oldHash: String,
  newHash: String,
  timestamp: {
    type: Number,
    default: Date.now(),
    required: true
  }
})

const Transaction = mongoose.model('Transaction', txSchema)

module.exports = { Transaction, txSchema }
