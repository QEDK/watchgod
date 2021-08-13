require('dotenv').config()
const express = require('express')
const axios = require('axios')
const morgan = require('morgan')
const mongoose = require('mongoose')
const Transaction = require('./schema.js')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))

app.get('/', async function (req, res) {
  res.send('Blocknative POC API')
})

app.post('/watch', async function (req, res) {
  try {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(req.body.hash)) {
      throw new Error('Invalid hash sent')
    }
    await axios.post('https://api.blocknative.com/transaction', {
      apiKey: process.env.API_KEY,
      hash: req.body.hash,
      blockchain: 'ethereum',
      network: 'goerli'
    })
    Transaction.create({ hash: req.body.hash })
    res.sendStatus(200)
  } catch (e) {
    console.error('error:', e)
    res.sendStatus(400)
  }
})

app.post('/update', async function (req, res) {
  try {
    if (req.body.replaceHash !== undefined) {
      Transaction.create({
        hash: req.body.replaceHash,
        status: req.body.status,
        lastCall: req.body,
        oldHash: req.body.hash
      }) // add the new tx to db
      Transaction.updateOne(
        { hash: req.body.hash },
        { status: req.body.status, lastCall: req.body, timestamp: Date.now(), newHash: req.body.replaceHash }
      ) // update old tx status (speedup/cancels)
    } else {
      Transaction.updateOne(
        { hash: req.body.hash },
        { status: req.body.status, lastCall: req.body, timestamp: Date.now() }
      ) // update all other kind of txs
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('error:', e)
    res.sendStatus(400)
  }
})

app.get('/status', async function (req, res) {
  try {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(req.query.hash)) {
      throw new Error('Invalid hash sent')
    }
    let result = await Transaction.findOne({ hash: req.query.hash }, { _id: 0, 'lastCall.apiKey': 0, __v: 0 })
    if (!result) {
      result = {}
    }
    res.send(result).json()
  } catch (e) {
    console.error('error:', e)
    res.sendStatus(400)
  }
})

const run = async () => {
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('☑️  DB connected')
    app.listen(process.env.PORT || 8080, () => {
      console.log(`🚀 Server starting on port ${process.env.PORT || 8080}...`)
    })
  } catch (e) {
    console.error('❎ error: ' + e)
    process.exit(1)
  }
}

run()
