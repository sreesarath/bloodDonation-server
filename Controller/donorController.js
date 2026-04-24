const Donor = require('../Models/donorModel');

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
        const { bloodgroup, weight, phone, lastDonated, lat, lng,gender } = req.body;

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
            isEligible,
            location: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
            }
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
        const donors = await Donor.find()
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