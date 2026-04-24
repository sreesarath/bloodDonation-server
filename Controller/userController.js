const User = require('../Models/userModel')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

// Generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  })
}

// Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" })
    }

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      bio: "",
      profile: "",
      role: "User"
    })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,   
      profile: user.profile,
      token: generateToken(user._id)
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message })
  }
}

// Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Invalid data" })
    }

    const user = await User.findOne({ email })

    if (user && await bcrypt.compare(password, user.password)) {
        const token = generateToken(user._id)
     res.json({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    role: user.role
  }
});
    } else {
      return res.status(401).json({ message: "Invalid credentials" })
    }

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message })
  }
}