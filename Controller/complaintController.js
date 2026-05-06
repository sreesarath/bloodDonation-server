require('../Models/userModel')
require('../Models/donorModel')
const User = require('../Models/userModel')
const Donor = require('../Models/donorModel')
const Complaint = require('../Models/complaintModel')


//create

exports.createComplaints = async (req, res) => {
    try {
        const io = req.app.get("io");
        const { donorId, reason, description } = req.body; // donorId comes from frontend

        if (!donorId || !reason || !description) {
            return res.status(400).json({ message: "All fields required" });
        }

        const complaint = await Complaint.create({
            requesterId: req.payload,
            donorId: donorId,
            reason,
            description,
        });

        res.status(201).json(complaint);

        // Socket notification
        if (io) {
            io.to(donorId.toString()).emit("notification", {
                message: "New complaint received",
                type: "error",
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
};
exports.respondComplaint = async (req, res) => {
    const { id } = req.params;
    const { response } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
        id,
        {
            donorResponse: response,
            status: "RESPONDED",
        },
        { new: true }
    );

    res.json(complaint);
};

// ESCALATE
exports.escalateComplaint = async (req, res) => {
    const { id } = req.params;

    const complaint = await Complaint.findByIdAndUpdate(
        id,
        { status: "ESCALATED" },
        { new: true }
    );

    res.json(complaint);
};

// ADMIN ACTION
exports.adminAction = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    const io = req.app.get("io");

    const complaint = await Complaint.findById(id);

    if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
    }

    let status = "CLOSED"; // all go to archive
    let message = "";

    //  HANDLE ACTIONS
    if (action === "warn") {
        message = "You have received an official warning from admin.";
    }

    if (action === "suspend") {
        message = " Your account has been suspended due to complaint.";

        //  DELETE donor account
        await Donor.findByIdAndDelete(complaint.donorId);
        await User.findByIdAndDelete(complaint.donorId);
    }

    if (action === "close") {
        message = " Complaint has been resolved by admin.";
    }

    //  UPDATE COMPLAINT
    const updatedComplaint = await Complaint.findByIdAndUpdate(
        id,
        { status },
        { new: true }
    );

    //  SEND SOCKET NOTIFICATION
    if (io) {
        io.to(complaint.donorId.toString()).emit("notification", {
            message,
            type: "admin_action",
        });
    }

    res.json(updatedComplaint);
};

// GET DONOR COMPLAINTS
exports.getDonorComplaints = async (req, res) => {
    const donor = await Donor.findOne({ userId: req.payload });
    if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
    }
    const data = await Complaint.find({ donorId: req.payload }).populate("requesterId", "name email");
    res.json(data);
};

// GET ADMIN
exports.getAdminComplaints = async (req, res) => {
    const data = await Complaint.find({ status: "ESCALATED" })
        .populate("requesterId", "name email")
        .populate("donorId", "name email");
    res.json(data);
};
// GET MY COMPLAINTS (REQUESTER)
// Ensure this import exists at the top of your controller file


exports.getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({
            requesterId: req.payload,

        })
            .populate("donorId", "name email profile")
            .sort({ createdAt: -1 });

        res.status(200).json(complaints);

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};
exports.resolveComplaint = async (req, res) => {
    const { id } = req.params;

    const complaint = await Complaint.findByIdAndUpdate(id, {
        status: "CLOSED"
    }, { new: true });
    complaint.status = "RESOLVED";



    res.json(complaint);
};