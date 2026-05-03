const Donor = require('../Models/donorModel');
const User = require('../Models/userModel')
const Request = require('../Models/requestModel')
const mongoose = require('mongoose')

/**
 * @desc    Helper to check if a donor is eligible (90-day rule)
 * @param   {Date} lastDonatedDate 
 * @returns {Boolean}
 */
const checkEligibility = (lastDonatedDate) => {
    if (!lastDonatedDate) return true;
    const daysSinceDonation = (new Date() - new Date(lastDonatedDate)) / (1000 * 60 * 60 * 24);
    return daysSinceDonation >= 90;
};

// 1. REGISTER DONOR
exports.registerDonor = async (req, res) => {
    try {
        const { bloodgroup, weight, phone, lastDonated, lat, lng, gender } = req.body;
        const io = req.app.get("io");

        // Basic Validation
        if (!bloodgroup || !phone || !lat || !lng || !gender) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        // Logic: Check if user is already a donor
        const existingDonor = await Donor.findOne({ userId: req.user._id });
        if (existingDonor) {
            return res.status(400).json({ message: "You are already registered as a donor" });
        }

        // Eligibility check
        const isEligible = checkEligibility(lastDonated);

        const newDonor = await Donor.create({
            userId: req.user._id,
            bloodgroup,
            phone,
            gender,
            weight,
            lastDonated,
            idProof: req.file ? req.file.path : "",
            isEligible: isEligible,
            status: "pending",
            location: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            }
        });
        io.emit("newDonorRequest", {
            message: "New donor registration request",
            donor: newDonor
        });

        res.status(201).json({
            success: true,
            message: "Donor registered successfully",
            data: newDonor
        });

    } catch (err) {
        console.error("Donor Registration Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. GET ALL DONORS
exports.getAllDonors = async (req, res) => {
    try {
        const donors = await Donor.find({status:"approved"})
            .populate("userId", "name email profile") // Added profile to population
            .sort({ createdAt: -1 }); // Show newest donors first

        res.status(200).json({
            success: true,
            count: donors.length,
            data: donors
        });

    } catch (err) {
        console.error("Fetch Donors Error:", err);
        res.status(500).json({ success: false, message: "Server error while fetching donors" });
    }
};
//get profile a compine model of donor user and reuest

exports.getMyProfile = async (req, res) => {
    try {
        const userId = req.user._id
        // basic info
        const user = await User.findById(userId)
        const donor = await Donor.findOne({ userId })
        //get last donation date from requseter

        const lastDonationDate = await Request.aggregate([
            { $unwind: "$acceptedDonors" },
            {
                $match: {
                    "acceptedDonors.donorId": new mongoose.Types.ObjectId(userId),
                    "acceptedDonors.status": "completed"
                }
            },
            { $sort: { "acceptedDonors.scheduledDate": -1 } },
            { $limit: 1 },
            { $project: { lastDate: "$acceptedDonors.scheduledDate" } }
        ])
        const lastDonated = lastDonationDate.length > 0
            ? lastDonationDate[0].lastDate
            : donor?.lastDonated
        // check eligiblity

        const isEligible = checkEligibility(lastDonated)

        //total donation cound

        const totalDonation = await Request.countDocuments({
            "acceptedDonors.donorId": userId,
            "acceptedDonors.status": "completed"
        });
        // badge
        let badge = "New Donor"
        if (totalDonation >= 5) {
            badge = "Hero Donor"
        }
        else if (totalDonation >= 1) {
            badge = "Active Donor"
        }
        res.status(200).json({
            success: true,
            data: {
                ...user._doc,
                bloodgroup: donor?.bloodgroup,
                lastDonated: lastDonated,
                isEligible: isEligible,
                status: donor?.status,
                totalDonation,
                badge
            }
        })
    } catch (err) {
        console.log(err);
        res.status(500).json(err)

    }

}
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id
        const { name, phone, secondaryPhone, bloodgroup } = req.body
        await User.findByIdAndUpdate(userId, {
            name, phone, secondaryPhone
        })
        await Donor.findOneAndUpdate(
            { userId },
            { bloodgroup }
        )
        res.status(200).json({ message: "Profile updated" });
    } catch (err) {
        console.log(err);
        res.status(500).json(err)

    }
}
exports.uploadProfileImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    await User.findByIdAndUpdate(req.user._id, {
        profile: imageUrl
    });

    res.json({ image: imageUrl });
};
exports.deleteAccount = async (req, res) => {
    const userId = req.user._id;

    await User.findByIdAndDelete(userId);
    await Donor.findOneAndDelete({ userId });

    res.json({ message: "Account deleted" });
};
exports.toggleAvailability = async (req, res) => {
    const donor = await Donor.findOne({ userId: req.user._id });

    const isEligible = checkEligibility(donor.lastDonated)
    if (!isEligible) {
        return res.status(400).json({
            message: "You are not eligible yet (90-day rule)"
        });
    }
    donor.isEligible = !donor.isEligible



    await donor.save();

    res.json({ isEligible: donor.isEligible });
};
exports.getDonorById = async (req, res) => {
    try {
        const userId = req.params.id
        const user = await User.findById(userId)
        const donor = await Donor.findOne({ userId })

        const lastDonationDate = await Request.aggregate([
            { $unwind: "$acceptedDonors" },
            {

                $match: {
                    "acceptedDonors.donorId": new mongoose.Types.ObjectId(userId),
                    "acceptedDonors.status": "completed"
                }
            }, { $sort: { "acceptedDonors.scheduledDate": -1 } },
            { $limit: 1 },
            { $project: { lastDate: "$acceptedDonors.scheduledDate" } }
        ])

        const lastDonated =
            lastDonationDate.length > 0
                ? lastDonationDate[0].lastDate
                : donor?.lastDonated;

        const isEligible = checkEligibility(lastDonated);

        res.status(200).json({
            success: true,
            data: {
                ...donor._doc,
                userId: user,
                lastDonated,
                isEligible
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).json(err)

    }
}
