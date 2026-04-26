const mongoose = require('mongoose')

const requestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    hospital: {
        type: String,
        required: true
    },
    bloodgroup: {
        type: String,
        required: true
    },
    unitsNeeded: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },

    acceptedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["pending", "completed", "expired"],
        default: "pending"
    },

    donors: [{
        name: String,
        email: String,
        phone: String,
    }],
    acceptedDonors: [
        {
            donorId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            status: { type: String, enum: ["accepted", "rejected", "completed"], default: "accepted" },
            reason: String,
            scheduledDate: Date,
            rating: { type: Number, min: 1, max: 5 },
            review: String
        }
    ],
    location: {
        type: {
            type: String,

            default: "Point"
        },
        coordinates: [Number]
    }
}, { timestamps: true })

requestSchema.index({ location: "2dsphere" })

module.exports = mongoose.model('request', requestSchema)