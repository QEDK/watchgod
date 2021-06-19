const { watchTx } = require('../services/bn-api')

export const watch = async(req, res) => {
  try {
    if (!/^0x([A-Fa-f0-9]{64})$/.test(req.body.hash)) {
      res.sendStatus(400)
      return
    }
    const result = await watchTx(req.body.hash)
    res.status(200).json(result)
  } catch (error) {
    console.log('error', error)
    return res.status(500).json({ error: error.message })
  }
}
