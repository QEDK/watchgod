require('dotenv').config()
const express = require('express')
const axios = require('axios')
const morgan = require('morgan')
const mongoose = require('mongoose')
const swaggerUi = require('swagger-ui-express')
const swaggerJsdoc = require('swagger-jsdoc')
const { Transaction, txSchema } = require('./schema.js')

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
  apis: ['./models/*.js', './helpers/*.js', './routes/*.js'] // files containing annotations as above
}

const openapiSpecification = swaggerJsdoc(options)

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification))

if (!process.env.API_KEY || !process.env.AUTHORIZATION_TOKEN) {
  console.error('❎ error: Configuration missing, see .env.example')
  process.exit(1)
}

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
