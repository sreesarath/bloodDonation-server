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
    acceptedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,

        default: "pending"
    },

    donors: [{
        name: String,
        email: String,
        mobile: String,
    }],
    acceptedDonors: [
        {
            donorId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            status: { type: String, enum: ["accepted", "rejected"], default: "accepted" },
            reason: String
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