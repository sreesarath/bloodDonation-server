const mongoose = require('mongoose')

const donorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    bloodgroup: {
        type: String,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    lastDonated: {
        type: Date
    },

    badge: {
        type: String,
        default: "New Donor"
        // New Donor | Active Donor | Hero Donor
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"

        },

        coordinates:
        {
            type: [Number],
            required: true
        }// logitude and latitude
    },
    isEligible: {
        type: Boolean,
        default: true
    },
    hasDisease:{
        type:String,
        enum:["Yes","No"]
    },
       donationCount: {
        type: Number,
        default: 0
    },
        isOnMedication:{
        type:String,
        enum:["Yes","No"]
    },
        hasAllergies:{
        type:String,
        enum:["Yes","No"]
    },
        donatedBefore:{
        type:String,
        enum:["Yes","No"]
    },
        traveledAbroad:{
        type:String,
        enum:["Yes","No"]
    },
}, { timestamps: true })
donorSchema.index({ location: "2dsphere" })
module.exports = mongoose.model('donor', donorSchema)