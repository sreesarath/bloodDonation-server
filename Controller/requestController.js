const Request = require('../Models/requestModel')
const Donor = require('../Models/donorModel');
const mongoose = require('mongoose')



// create request
exports.createRequest = async (req, res) => {
    const { hospital, bloodgroup, unitsNeeded, lat, lng, startDate, endDate } = req.body
    const userId = req.user._id;
    try {
        //create the request
        const newRequest = new Request({
            userId, hospital, bloodgroup, unitsNeeded, startDate, endDate,
            location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
        });
        await newRequest.save()
        // find the matching donor
        const matchingDonors = await Donor.find({

            bloodgroup: bloodgroup,
            isEligible: true,
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: 50000 // 50km
                }
            }
        }).populate('userId');
        const io = req.app.get('io');
        matchingDonors.forEach(donor => {
            const donorId = donor.userId._id.toString();
            // Check if this donor has an active socketId

            io.to(donorId).emit('urgentBloodRequest', {
                message: `Urgent ${bloodgroup} needed at ${hospital}!`,
                requestId: newRequest._id,
                hospital: hospital
            });

        });

        res.status(201).json({
            message: "Request created and matches notified",
            data: newRequest
        });
    } catch (err) {
        console.error("Request Error:", err);
        res.status(500).json({ message: err.message });
    }
}
exports.getNearbyDonors = async (req, res) => {
    try {
        const { lat, lng, bloodgroup } = req.query;

        // 1. Validate coordinates
        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and Longitude are required" });
        }

        // 2. Build the query
        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 50000 // 50km in meters
                }
            }
        };

        // 3. Add optional Blood Group filter
        if (bloodgroup) {
            query.bloodgroup = bloodgroup;
        }

        // 4. Execute query
        const donors = await Donor.find(query)
            .populate("userId", "name email profile"); // Populate donor info

        res.status(200).json({
            success: true,
            count: donors.length,
            data: donors
        });

    } catch (err) {
        console.error("Nearby Donors Error:", err);
        res.status(500).json({ success: false, message: "Error fetching nearby donors" });
    }
};
exports.getMyrequests = async (req, res) => {
    try {
        const requests = await Request.find({ userId: req.user._id })
            .populate("acceptedDonors.donorId", "name phone");

        const formatted = requests.map(r => ({
            ...r._doc,
            donors: r.acceptedDonors
                .filter(d => d.status === "accepted")
                .map(d => ({
                    name: d.donorId?.name,
                    phone: d.donorId?.phone,
                    date: d.scheduledDate
                }))
        }));

        res.status(200).json({ success: true, data: formatted });

    } catch (err) {
        res.status(500).json(err);
    }
};
exports.deleteRequest = async (req, res) => {
    try {
        const reqId = req.params.id;
        // 1. Validate if it's a valid ID format first
        if (!mongoose.Types.ObjectId.isValid(reqId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const deleted = await Request.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(reqId), // Explicitly convert to ObjectId
            userId: req.user._id
        });

        if (!deleted) {
            return res.status(404).json({ message: "Request not found or unauthorized" });
        }

        res.status(200).json({ message: "Request deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ message: "Server error during deletion" });
    }
};
exports.getNearbyRequests = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: "Location required" });
        }
        const donor = await Donor.findOne({ userId: req.user._id });
        if (!donor) {
            return res.status(400).json({ message: "You are not a registered donor" });
        }
        const today = new Date()
        const requests = await Request.find({
            userId: { $ne: req.user._id }, // can not see  my own requests
            //  MATCH BLOOD GROUP
            bloodgroup: donor.bloodgroup,
            
            endDate: { $gte: today },

            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: 50000 // 50km
                }
            }
        });
        res.status(200).json({ success: true, data: requests });
    } catch (err) {
        res.status(500).json({ message: "Error fetching nearby requests" });
    }
}
exports.acceptRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { scheduledDate } = req.body
                const data = await Request.findById(requestId);
        if (!data) {
  return res.status(404).json({ message: "Request not found" });
}
        //valid date inside the range

        if (
            new Date(scheduledDate) < new Date(data.startDate) ||
            new Date(scheduledDate) > new Date(data.endDate)
        ) {
            return res.status(400).json({ message: "Selected date is outside allowed range" });
        }
        //  validate id
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        //  fetch request
        const request = await Request.findById(requestId).populate("userId");

        //  check if exists
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        //  prevent duplicate
        const already = request.acceptedDonors.find(
            d => d.donorId && d.donorId.toString() === req.user._id.toString()
        );

        if (already) {
            return res.status(400).json({ message: "Already responded" });
        }

        //  add donor
        request.acceptedDonors.push({
            donorId: req.user._id,
            status: "accepted",
            scheduledDate
        });

        request.acceptedCount += 1;
        if (request.acceptedCount >= request.unitsNeeded) {
            request.status = "completed";
        }
        await request.save();

        //  socket emit
        const io = req.app.get("io");
        io.to(request.userId._id.toString()).emit("requestAccepted", {
            requestId: request._id
        });

        res.status(200).json({ message: "Request accepted" });

    } catch (err) {
        console.log("ACCEPT ERROR:", err);
        res.status(500).json({ message: err.message });
    }
};
exports.rejectRequest = async (req, res) => {
    try {
        const { reason } = req.body
        const requestId = req.params.id
        const request = await Request.findById(requestId);
        request.acceptedDonors.push({
            donorId: req.user._id,
            status: "rejected",
            reason
        })
        await request.save();

        res.status(200).json({ message: "Request rejected" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
}