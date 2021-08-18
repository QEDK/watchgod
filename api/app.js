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

if (!process.env.API_KEY || !process.env.AUTHORIZATION_TOKEN) {
  console.error('❎ error: Configuration missing, see .env.example')
  process.exit(1)
}

const authenticate = async (req, res, next) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.AUTHORIZATION_TOKEN}`) {
      next()
    } else {
      throw new Error('Invalid or missing token')
    }
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(403)
  }
}

const verify = async (req, res, next) => {
  try {
    if (req.body.apiKey === process.env.API_KEY) {
      next()
    } else {
      throw new Error('Invalid API key')
    }
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(403)
  }
}

app.get('/', async function (req, res) {
  res.send('Watchgod API')
})

app.post('/watch', authenticate, async function (req, res) {
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
    await Transaction.create({ hash: req.body.hash, network: req.body.network })
    res.sendStatus(200)
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(400)
  }
})

app.post('/update', verify, async function (req, res) {
  try {
    if (req.body.replaceHash !== undefined) {
      await Transaction.create({
        hash: req.body.replaceHash,
        oldHash: req.body.hash,
        network: req.body.network,
        status: req.body.status,
        from: req.body.from,
        to: req.body.to
      }) // add the new tx to db
      await Transaction.updateOne(
        { hash: req.body.hash, network: req.body.network },
        { status: req.body.status, timestamp: Date.now(), newHash: req.body.replaceHash }
      ) // update latest tx status (speedup/cancels)
      await Transaction.updateMany(
        { newHash: req.body.hash, network: req.body.network },
        { status: req.body.status, newHash: req.body.replaceHash }
      ) // update older txs, if any
    } else {
      await Transaction.updateOne(
        { hash: req.body.hash, network: req.body.network },
        { status: req.body.status, from: req.body.from, to: req.body.to, timestamp: Date.now() }
      ) // update all other kind of txs
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(400)
  }
})

app.get('/status', authenticate, async function (req, res) {
  try {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(req.query.hash)) {
      throw new Error('Invalid hash sent')
    }
    let result = await Transaction.findOne(
      { hash: req.query.hash, network: req.query.network }, { _id: 0, __v: 0 }
    )
    if (!result) {
      result = {}
    }
    res.send(result).json()
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(400)
  }
})

app.get('/history', authenticate, async function (req, res) {
  try {
    if (!req.query.from) {
      throw new Error('From field missing')
    }
    const pagination = { count: Math.max(parseInt(req.query.count || 10), 20), skip: parseInt(req.query.skip || 0) }
    req.query.count = req.query.skip = undefined
    console.log(req.query)
    let result = await Transaction.find(
      { ...req.query },
      { _id: 0, __v: 0 },
      { limit: pagination.count, skip: pagination.skip }
    ).sort({ timestamp: 'desc' })
    if (!result) {
      result = {}
    }
    res.send(result).json()
  } catch (e) {
    console.error('❎ error:', e)
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
    console.error('❎ error:', e)
    process.exit(1)
  }
}

run()
