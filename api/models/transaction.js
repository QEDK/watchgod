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
*         contractAddress:
*           type: string
*         bridgeType:
*           type: string
*         rootToken:
*           type: string
*         from:
*           type: string
*         to:
*           type: string
*         data:
*           type: string
*         amount:
*           type: string
*         oldHash:
*           type: string
*         newHash:
*           type: string
*         blockNumber:
*           type: number
*         timestamp:
*           type: number
*/

const txSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    index: true,
    lowercase: true
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
    default: 'other',
    enum: ['burn', 'exit', 'deposit', 'approve', 'confirmWithdraw', 'other']
  },
  prevBurnHash: {
    type: String,
    lowercase: true
  },
  contractAddress: {
    type: String,
    lowercase: true
  },
  bridgeType: {
    type: String,
    enum: ['pos', 'plasma', 'fx']
  },
  rootToken: {
    type: String,
    lowercase: true
  },
  from: {
    type: String,
    lowercase: true
  },
  to: {
    type: String,
    lowercase: true
  },
  data: {
    type: String,
    lowercase: true
  },
  amount: String,
  oldHash: {
    type: String,
    lowercase: true
  },
  newHash: {
    type: String,
    lowercase: true
  },
  blockNumber: Number,
  timestamp: {
    type: Number,
    default: Date.now(),
    required: true
  }
})

const Transaction = mongoose.model('Transaction', txSchema)

module.exports = { Transaction, txSchema }
