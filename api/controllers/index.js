const watchController = async (req, res) => {
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
}

const updateController = async (req, res) => {
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
}

const statusController = async (req, res) => {
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
}

const historyController = async (req, res) => {
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
}

module.exports = { watchController, updateController, statusController, historyController }
