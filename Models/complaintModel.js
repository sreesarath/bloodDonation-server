const mongoose = require("mongoose");
const User=require('../Models/userModel')
const Donor=require('../Models/donorModel')

const complaintSchema = new mongoose.Schema({
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    reason: { type: String },
    description: { type: String },
    donorResponse: { type: String },
    status: {
        type: String,
        enum: [
            "PENDING_DONOR",
            "RESPONDED",
            "RESOLVED",
            "ESCALATED",
            "CLOSED"
        ],
        default: "PENDING_DONOR"
    },
},{ timestamps: true })
const complaint=mongoose.model('complaint',complaintSchema)
module.exports=complaint
