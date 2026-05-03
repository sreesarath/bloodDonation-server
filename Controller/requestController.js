const Request = require('../Models/requestModel')
const Donor = require('../Models/donorModel');
const mongoose = require('mongoose')



// create request
exports.createRequest = async (req, res) => {
    const { hospital, bloodgroup, unitsNeeded, lat, lng, startDate, endDate } = req.body
    if (!hospital || !bloodgroup || !unitsNeeded || !lat || !lng) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and End dates required" });
    }
    const userId = req.user._id;
    try {
        //create the request
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const newRequest = new Request({
            userId, hospital, bloodgroup, unitsNeeded, startDate, endDate,
            location: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] }
        });
        await newRequest.save()
        // find the matching donor
        const matchingDonors = await Donor.find({
            
            bloodgroup: bloodgroup,
            status: "approved",
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
                const last = donor.lastDonated;

    const eligible =
        !last || new Date(last) <= cutoff;

    if (!eligible) return;
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
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 90)

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
        query.$or = [
            { lastDonated: { $exists: false } },
            { lastDonated: { $lte: cutoff } }
        ];

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
            donors: r.acceptedDonors.map(d => ({
                requestId: r._id,
                donorId: d.donorId?._id,
                name: d.donorId?.name,
                phone: d.donorId?.phone || "N/A",
                date: d.scheduledDate,
                status: d.status,
                rating: d.rating
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
        const isEligible = (lastDonated) => {
            if (!lastDonated) return true
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    return new Date(lastDonated) <= cutoff;
        }
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: "Location required" });
        }
        const donor = await Donor.findOne({ userId: req.user._id });
        if (!donor) {
            return res.status(400).json({ message: "You are not a registered donor" });
        }
        const eligible = isEligible(donor.lastDonated)
        if (!eligible) {
            return res.status(200).json({
                success: true,
                data: [],
                message: "You are not eligible to receive requests (90-day rule)"
            });
        }
        const today = new Date()
        await Request.updateMany(
            { endDate: { $lt: today }, status: { $ne: "completed" } },
            { status: "expired" }
        );
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
        }).populate("userId", "name phone")
            .populate("acceptedDonors.donorId", "_id name phone ");
        res.status(200).json({ success: true, data: requests });
    } catch (err) {
        res.status(500).json({ message: "Error fetching nearby requests" });
    }
}
exports.acceptRequest = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { scheduledDate } = req.body;

        // ✅ validate id FIRST
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        // ✅ validate date
        if (!scheduledDate) {
            return res.status(400).json({ message: "Scheduled date is required" });
        }

        // ✅ fetch request ONCE
        const request = await Request.findById(requestId).populate("userId");

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        // ✅ validate date range
        const selected = new Date(scheduledDate);

        if (
            selected < new Date(request.startDate) ||
            selected > new Date(request.endDate)
        ) {
            return res.status(400).json({ message: "Selected date is outside allowed range" });
        }

        // ✅ prevent duplicate
        const already = request.acceptedDonors.find(
            d => d.donorId?.toString() === req.user._id.toString()
        );

        if (already) {
            return res.status(400).json({ message: "Already responded" });
        }

        // ✅ add donor
        request.acceptedDonors.push({
            donorId: req.user._id,
            status: "accepted",
            scheduledDate: selected
        });

        request.acceptedCount += 1;

        if (request.acceptedCount >= request.unitsNeeded) {
            request.status = "completed";
        }

        await request.save();

        // ✅ socket emit
        const io = req.app.get("io");
        io.to(request.userId._id.toString()).emit("requestAccepted", {
            requestId: request._id
        });

        return res.status(200).json({
            message: "Request accepted",
            requester: {
                name: request.userId.name,
                phone: request.userId.phone
            }
        });

    } catch (err) {
        console.log("ACCEPT ERROR:", err);
        return res.status(500).json({ message: err.message });
    }
};
exports.rejectRequest = async (req, res) => {
    try {
        const { reason } = req.body
        const requestId = req.params.id
        const request = await Request.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
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
exports.completeDonation = async (req, res) => {
    try {
        const requestId = req.params.id;

        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        const donor = request.acceptedDonors.find(
            d => d.donorId.toString() === req.user._id.toString()
        );

        if (!donor || donor.status !== "accepted") {
            return res.status(400).json({ message: "Not eligible" });
        }

        donor.status = "completed";
        const completedCount = request.acceptedDonors.filter(
            d => d.status === "completed"
        ).length;

        if (completedCount >= request.unitsNeeded) {
            request.status = "completed";
        }

        await request.save();

        res.status(200).json({ message: "Donation marked as completed" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
}
exports.rateDonors = async (req, res) => {
    try {
        const { rating, review } = req.body
        const requestId = req.params.id
        const request = await Request.findById(requestId)
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        const donor = request.acceptedDonors.find((val) => val.donorId.toString() === req.body.donorId)
        if (!donor || donor.status !== "completed") {
            return res.status(400).json({ message: "Cannot rate before donation" });
        }

        donor.rating = rating;
        donor.review = review;

        await request.save();

        res.status(200).json({ message: "Rated successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
}
// exports.getMyAcceptedRequests = async (req, res) => {
//     try {
//         const requests = await Request.find({
//             "acceptedDonors.donorId": req.user._id
//         }).populate("userId", "name phone hospital");

//         const formatted = requests.map(r => {
//             const myData = r.acceptedDonors.find(
//                 d => d.donorId.toString() === req.user._id.toString()
//             );

//             return {
//                 _id: r._id,
//                 hospital: r.hospital,
//                 bloodgroup: r.bloodgroup,
//                 requester: {
//                     name: r.userId.name,
//                     phone: r.userId.phone
//                 },
//                 status: myData.status,
//                 date: myData.scheduledDate
//             };
//         });

//         res.status(200).json({ data: formatted });

//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// };

exports.getDonorsAvgRating=async(req,res)=>{
    try {
        const donorId=req.params.id
        const result=await Request.aggregate([
            {$unwind : "$acceptedDonors"},
            {
                $match:{
                    "acceptedDonors.donorId":new mongoose.Types.ObjectId(donorId),
                    "acceptedDonors.rating":{$exists:true}
                }
            },{
                $group:{
                    _id:"$acceptedDonors.donorId",
                    avgRating:{$avg:"$acceptedDonors.rating"},
                    totalRatings:{$sum:1}
                }
            }
        ])
        if (!result.length) {
            return res.status(200).json({
                avgRating:0,
                totalRatings:0
            })
        }
        res.status(200).json(result[0])
        
    } catch (err) {
        console.log(err);
        res.status(500).json(err)
        
    }
}