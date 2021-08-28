require('dotenv').config()
const express = require('express')
const axios = require('axios')
const morgan = require('morgan')
const mongoose = require('mongoose')
const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const { Transaction, txSchema } = require('./schema.js')
const { body, query, validationResult } = require('express-validator')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('tiny'))

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Watchgod Swagger UI',
      version: '1.0.0'
    }
  },
  apis: ['./app.js', './schema.js'] // files containing annotations as above
}

const openapiSpecification = swaggerJsdoc(options)

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification))

if (!process.env.API_KEY || !process.env.AUTHORIZATION_TOKEN) {
  console.error('❎ error: Configuration missing, see .env.example')
  process.exit(1)
}

/**
* @openapi
* components:
*   securitySchemes:
*     bearerAuth:
*       type: http
*       scheme: bearer
*   responses:
*     UnauthorizedError:
*       description: Access token is missing or invalid
*/

const authenticate = async (req, res, next) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.AUTHORIZATION_TOKEN}`) {
      next()
    } else {
      throw new Error('Invalid or missing token')
    }
  } catch (e) {
    console.error('❎ error:', e)
    res.sendStatus(401)
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
    res.sendStatus(401)
  }
}

app.get('/', async function (req, res) {
  res.send('Watchgod API')
})

/**
 * @openapi
 * /watch:
 *  post:
 *    tags:
 *     - External
 *    summary: Submit a transaction hash to track
 *    security:
 *      - bearerAuth: []
 *    requestBody:
 *      description: Transaction and related parameters to track over time
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              hash:
 *                type: string
 *                example: "0x00cae379d2098fb1a1ace0bd96939829304cc188d5fa9adcc9c6ae265c0ee82a"
 *                required: true
 *              network:
 *                type: string
 *                example: "main"
 *                required: true
 *              txType:
 *                type: string
 *                example: "other"
 *              prevBurnHash:
 *                type: string
 *                example: "0x00cae379d2098fb1a1ace0bd96939829304cc188d5fa9adcc9c6ae265c0ee82a"
 *    responses:
 *      '200':
 *        description: A successful response
 *      '400':
 *        description: Bad request
 *      '401':
 *        $ref: '#/components/responses/UnauthorizedError'
 */
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
        prevBurnHash: req.body.prevBurnHash,
        txType: req.body.txType
      })
      res.sendStatus(200)
    } catch (e) {
      console.error('❎ error:', e)
      res.sendStatus(400)
    }
  })

/**
 * @openapi
 * /update:
 *  post:
 *    tags:
 *     - Internal
 *    summary: Internal endpoint for use by Blocknative's webhook API
 *    parameters:
 *      - in: body
 *        name: apiKey
 *        schema:
 *          type: string
 *          example: "t4vU-yFMVeaP0whDs2hbmV_S9HkymZ5c5GYw"
 *        required: true
 *        description: API key to verify requests
 *    responses:
 *       '200':
 *        description: A successful response
 *       '400':
 *        description: Bad request
 *       '401':
 *        $ref: '#/components/responses/UnauthorizedError'
 */
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

/**
 * @openapi
 * /status:
 *  get:
 *    tags:
 *     - External
 *    summary: Get the status of a transaction on a network
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: hash
 *        schema:
 *          type: string
 *          example: "0x00cae379d2098fb1a1ace0bd96939829304cc188d5fa9adcc9c6ae265c0ee82a"
 *        required: true
 *        description: Hash to get the status of the transaction
 *      - in: query
 *        name: network
 *        schema:
 *          type: string
 *          example: "main"
 *        required: true
 *        description: Network on which to fetch the status of the transaction
 *    responses:
 *       '200':
 *        description: A successful response
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Transaction'
 *       '400':
 *        description: Bad request
 *       '401':
 *        $ref: '#/components/responses/UnauthorizedError'
 */
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

/**
 * @openapi
 * /history:
 *  get:
 *    tags:
 *     - External
 *    summary: Fetch the entire history of watched transactions from an address (in reverse chronological order)
 *    security:
 *      - bearerAuth: []
 *    parameters:
 *      - in: query
 *        name: from
 *        schema:
 *          type: string
 *          example: "0x1987013F26d9fa9a61856dE905668fcF6CAfE0A8"
 *        required: true
 *        description: The address to query the transactions from
 *      - in: query
 *        name: count
 *        schema:
 *          type: number
 *          example: 10
 *        description: Number of transactions to fetch, defaults to 10, maximum is 20
 *      - in: query
 *        name: skip
 *        schema:
 *          type: number
 *          example: 0
 *        description: Number of transactions to skip from the latest transaction
 *    responses:
 *       '200':
 *        description: A successful response
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Transaction'
 *       '400':
 *        description: Bad request
 *       '401':
 *        $ref: '#/components/responses/UnauthorizedError'
 */
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
      const pagination = { count: Math.min(parseInt(req.query.count ?? 10), 20), skip: parseInt(req.query.skip ?? 0) }
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
