require('dotenv').config()

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

module.exports = { authenticate, verify }
