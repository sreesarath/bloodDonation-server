const mongoose=require('mongoose')

const notificationSchema=new mongoose.Schema({
     userId: String,
  message: String,
  type: String, // approved / rejected
  isRead: { type: Boolean, default: false }
}
, { timestamps: true })
const notification=mongoose.model('notification',notificationSchema)
module.exports=notification
