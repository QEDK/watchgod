const express = require('express')
const transactionsController = require('../controllers/transactions')

const router = express.Router()

router.post('/watch', transactionsController.watch)
router.post('/update', transactionsController.update)

module.exports = router
