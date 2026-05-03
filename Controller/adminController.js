const User = require('../Models/userModel')
const Donor = require('../Models/donorModel')
const Request = require('../Models/requestModel')

exports.getAdminDash = async (req, res) => {
    try {

        const range = req.query.range


        let startDate = new Date()

        if (range === "7days") {
            startDate.setDate(startDate.getDate() - 7)
        } else if (range === "30days") {
            startDate.setDate(startDate.getDate() - 30)
        } else if (range === "6months") {
            startDate.setMonth(startDate.getMonth() - 6)
        } else if (range === "1year") {
            startDate.setFullYear(startDate.getFullYear() - 1)
        }
        const totalDonors = await Donor.countDocuments({ createdAt: { $gte: startDate } })

        const pendingRequests = await Request.countDocuments({ status: "pending", createdAt: { $gte: startDate } })
        const ApprovedRequests = await Request.countDocuments({ status: "completed", createdAt: { $gte: startDate } })

        const totalRequest = await Request.countDocuments({ createdAt: { $gte: startDate } })

        let successRate = 0
        if (totalRequest > 0) {
            successRate = ((ApprovedRequests / totalRequest) * 100).toFixed(1)
        }

        //  Blood group distribution
        const distribution = await Donor.aggregate([
            { $group: { _id: "$bloodgroup", count: { $sum: 1 } } }
        ])

        //  Monthly trends (REAL DATA)
        const monthlyTrends = await Request.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    donations: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ])

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const found = monthlyTrends.find(val => val._id === i + 1)
            return {
                month: monthNames[i],
                donations: found ? found.donations : 0
            }

        })

        res.status(200).json({
            success: true,
            stats: {
                totalDonors,
                pendingRequests,
                ApprovedRequests,
                successRate: `${successRate}%`
            },
            distribution: distribution.map(val => ({
                name: val._id,
                value: val.count
            })),
            trendData: monthlyData

        })

    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
}
exports.generateReport = async (req, res) => {
    try {
        const range = req.query.range

        let startDate = new Date()

        if (range === "7days") {
            startDate.setDate(startDate.getDate() - 7)
        } else if (range === "30days") {
            startDate.setDate(startDate.getDate() - 30)
        } else if (range === "6months") {
            startDate.setMonth(startDate.getMonth() - 6)
        } else if (range === "1year") {
            startDate.setFullYear(startDate.getFullYear() - 1)
        }

        const data = await Request.find({
            createdAt: { $gte: startDate }
        })

        let csv = "Donor,Status,Date\n"

        data.forEach(item => {
            csv += `${item.donor || "N/A"},${item.status},${item.createdAt}\n`
        })

        res.header("Content-Type", "text/csv")
        res.attachment("report.csv")
        return res.send(csv)

    } catch (err) {
        res.status(500).json(err)
    }
}
exports.approveDonor = async (req, res) => {
    try {
        const { id } = req.params

        const donor = await Donor.findByIdAndUpdate(id, {
            status: "approved",
            isEligible: true
        }, { new: true })

        const io = req.app.get("io");

        io.to(donor.userId.toString()).emit("notification", {
            type:"success",
            message: " You are approved as a donor!"
        });
        await Notification.create({
            userId: donor.userId,
            message: "You are approved as donor",
            type: "approved"
        });

        res.json({ message: "Approved" });

    } catch (err) {

        console.log(err);

        res.status(500).json(err)
    }
}
exports.rejectedDonor = async (req, res) => {
    try {
        const { id } = req.params;

        const donor = await Donor.findByIdAndUpdate(id, {
            status: "rejected",
            isEligible: false
        }, { new: true });
        const io = req.app.get("io");

        io.to(donor.userId.toString()).emit("donorRejected", {
            message: " Sorry! Your document is not valid."
        });

        res.json({ message: "Rejected" });

    } catch (err) {
        console.log(err);
        res.status(500).json(err)

    }
}