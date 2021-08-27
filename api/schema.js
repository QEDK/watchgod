require('dotenv').config()
const mongoose = require('mongoose')

/**
* @openapi
* components:
*   schemas:
*     Transaction:
*       type: object
*       properties:
*         hash:
*           type: string
*         status:
*           type: string
*         network:
*           type: string
*         txType:
*           type: string
*         prevBurnHash:
*           type: string
*         from:
*           type: string
*         to:
*           type: string
*         data:
*           type: string
*         oldHash:
*           type: string
*         newHash:
*           type: string
*         timestamp:
*           type: string
*/

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
