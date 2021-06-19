require('dotenv').config()
import express from 'express'
import cors from 'cors'
import Web3 from 'web3'
import MongoClient from 'mongodb'

import routes from './routes'

var web3 = new Web3(process.env.RPC_URL)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_URL}/${process.env.DB_NAME}\
?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

export const collection = async() => {
  try {
    console.log("Starting DB connection...")
    await client.connect()
    const db = await client.db("bntestdb")
    return db.collection("bntestdb")
    console.log("DB ready!")
  } catch (e) {
    console.log(e)
  }
}

var app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.listen(process.env.PORT || 8080, () => {
  console.log("Server starting on port 8080...")
})
