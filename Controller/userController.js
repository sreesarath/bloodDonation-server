const User = require('../Models/userModel')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')



const otpStore = new Map();
// Generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  })
}

// Register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = otpStore.get(email);

    if (!record || !record.verified) {
      return res.status(400).json({ message: "Please verify OTP first" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone
    });

    // remove OTP after success
    otpStore.delete(email);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 5 * 60 * 1000;

    // store in memory
    otpStore.set(email, { otp, expiry, verified: false });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "OTP Verification",
      text: `Your instaBlood verification code is ${otp}.  
Verify your account and be part of something truly life-saving ❤️  
Please don’t share this code with anyone.`
    });

    console.log("OTP:", otp);

    res.status(200).json({ message: "OTP sent successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (record.expiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // mark verified
    otpStore.set(email, { ...record, verified: true });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};