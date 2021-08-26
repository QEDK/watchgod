require('dotenv').config()
const express = require('express')
const axios = require('axios')
const morgan = require('morgan')
const mongoose = require('mongoose')
const { Transaction, txSchema } = require('./schema.js')
const { body, query, validationResult } = require('express-validator')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('tiny'))

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

app.post('/watch', authenticate,
  body('hash').custom((value) => {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(value)) {
      throw new Error('Invalid hash sent')
    }
    return true
  }),
  body('prevBurnHash').custom((value) => {
    if (value && !/^0x([A-Fa-f0-9]{64})$/.test(value)) {
      throw new Error('Invalid prevBurnHash sent')
    }
    return true
  }),
  body('network').custom((value) => {
    if (!txSchema.obj.network.enum.includes(value)) {
      throw new Error('Invalid network')
    }
    return true
  }), async function (req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const serviceRes = await axios.post('https://api.blocknative.com/transaction', {
        apiKey: process.env.API_KEY,
        hash: req.body.hash,
        blockchain: 'ethereum',
        network: req.body.network
      })
      if (serviceRes.status !== 200) {
        throw new Error(serviceRes.data)
      }
      await Transaction.create({
        hash: req.body.hash,
        network: req.body.network,
        prevBurnHash: req.body.prevBurnHash
      })
      res.sendStatus(200)
    } catch (e) {
      console.error('❎ error:', e)
      res.sendStatus(400)
    }
  })

app.post('/update', verify, async function (req, res) {
  try {
    if (req.body.replaceHash !== undefined) {
      const prevTx = await Transaction.updateOne(
        { hash: req.body.hash, network: req.body.network },
        { status: req.body.status, timestamp: Date.now(), newHash: req.body.replaceHash }
      ) // update latest tx status (speedup/cancels)
      await Transaction.create({
        hash: req.body.replaceHash,
        oldHash: req.body.hash,
        network: req.body.network,
        status: req.body.status,
        prevBurnHash: prevTx.prevBurnHash,
        from: req.body.from,
        to: req.body.to,
        data: req.body.input
      }) // add the new tx to db
      await Transaction.updateMany(
        { newHash: req.body.hash, network: req.body.network },
        { status: req.body.status, newHash: req.body.replaceHash }
      ) // update older txs, if any
    } else {
      await Transaction.updateOne(
        { hash: req.body.hash, network: req.body.network },
        { status: req.body.status, from: req.body.from, to: req.body.to, data: req.body.input, timestamp: Date.now() }
      ) // update all other kind of txs
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(400)
  }
})

app.get('/status', authenticate,
  query('hash').custom((value) => {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(value)) {
      throw new Error('Invalid hash sent')
    }
    return true
  }),
  query('network').custom((value) => {
    if (!txSchema.obj.network.enum.includes(value)) {
      throw new Error('Invalid network')
    }
    return true
  }), async function (req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      let result = await Transaction.findOne(
        { hash: req.query.hash, network: req.query.network }, { _id: 0, __v: 0 }
      ).lean()
      if (!result) {
        result = {}
      }
      res.send(result).json()
    } catch (e) {
      console.error('❎ error:', e)
      res.sendStatus(400)
    }
  })

app.get('/history', authenticate,
  query('from').custom((value) => {
    if (!value) {
      throw new Error('From field missing')
    }
    return true
  }), async function (req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
      const pagination = { count: Math.max(parseInt(req.query.count ?? 10), 20), skip: parseInt(req.query.skip ?? 0) }
      req.query.count = req.query.skip = undefined
      let result = await Transaction.find(
        { ...req.query },
        { _id: 0, __v: 0 },
        { limit: pagination.count, skip: pagination.skip }
      ).sort({ timestamp: 'desc' }).lean()
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
      console.log(`🚀 Server starting on port ${process.env.PORT || 8080} in ${process.env.APP_MODE || 'mainnet'} mode...`)
    })
  } catch (e) {
    console.error('❎ error:', e)
    process.exit(1)
  }
}

run()
