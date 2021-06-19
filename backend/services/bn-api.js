require('dotenv').config()
const axios = require('axios')
const { collection } = require('../index.js')

export const watchTx = async(hash) => {
  try {
    axios.post("https://api.blocknative.com/transaction", {
      "apiKey": process.env.API_KEY,
      "hash": hash,
      "blockchain": "ethereum",
      "network": "goerli"
    })
    const newDocument = {
      hash: req.hash,
      status: "watched",
      lastCall: null,
      timestamp: Date.now(),
    };
    const result = await collection.insertOne(newDocument)
    return result
  } catch(error) {
    console.log('error', error)
    return res.status(500).json({ error: error.message })
  }
}
