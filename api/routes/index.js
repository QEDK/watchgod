const express = require('express')
const { body, query } = require('express-validator')
const { authenticate, verify } = require('../helpers/index.js')
const { watchController, updateController, statusController, historyController } = require('../controllers/index.js')
const { txSchema } = require('../models/transaction.js')

const router = express.Router()

router.get('/', async function (req, res) {
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
 *              bridgeType:
 *                type: string
 *                example: "pos"
 *              rootToken:
 *                type: string
 *                example: "0x00cae379d2098fb1a1ace0bd96939829304cc188d5fa9adcc9c6ae265c0ee82a"
 *              amount:
 *                type: string
 *                example: "1000000000000000000"
 *    responses:
 *      '200':
 *        description: A successful response
 *      '400':
 *        description: Bad request
 *      '401':
 *        $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/watch', authenticate,
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
  }), watchController)

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
router.post('/update', verify, updateController)

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
router.get('/status', authenticate,
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
  }), statusController)

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
router.get('/history', authenticate,
  query('from').custom((value) => {
    if (!value) {
      throw new Error('From field missing')
    }
    return true
  }), historyController)

module.exports = router
