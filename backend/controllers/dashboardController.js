const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const User = require("../models/User");

// @desc    Get Dashboard Statistics
// @route   GET /api/dashboard/stats
// @access  Admin Only
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue (from non-cancelled invoices)
        const revenueData = await Invoice.aggregate([
            { $match: { paymentStatus: { $ne: "cancelled" } } },
            { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        // 2. Total Counts
        const totalInvoices = await Invoice.countDocuments({ paymentStatus: { $ne: "cancelled" } });
        const totalProducts = await Product.countDocuments();
        const totalStaff = await User.countDocuments({ role: "staff" });

        // 3. Recent Invoices
        const recentInvoices = await Invoice.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("createdBy", "name");

        // 4. Low Stock Products (if stock < 10)
        const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
            .limit(5)
            .populate("category", "name");

        res.json({
            stats: {
                totalRevenue,
                totalInvoices,
                totalProducts,
                totalStaff
            },
            recentInvoices,
            lowStockProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
