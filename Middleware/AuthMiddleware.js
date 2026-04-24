const jwt = require('jsonwebtoken')
const User = require('../Models/userModel')

const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {   
    try {
      token = req.headers.authorization?.split(" ")[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.user = await User.findById(decoded.id).select('-password')

      req.payload = decoded.id

     return next()
    } catch (err) {
      console.log(err)
      return res.status(401).json({ message: "Authorization failed" })
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }
}

module.exports = protect