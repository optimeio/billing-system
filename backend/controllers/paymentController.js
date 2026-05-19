const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const StockLog = require("../models/StockLog");
const Razorpay = require("razorpay");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");

// Initialize Razorpay instance safely (won't crash if keys are missing initially)
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

// @desc    Create payment request
// @route   POST /api/payments/create/:invoiceId
// @access  Admin/Staff
exports.createPayment = async (req, res) => {
    try {
        const { method } = req.body;
        const invoice = await Invoice.findById(req.params.invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (invoice.paymentStatus === "cancelled") {
            return res.status(400).json({ message: "Cannot pay a cancelled invoice" });
        }

        if (invoice.paymentStatus === "paid") {
            return res.status(400).json({ message: "Invoice is already paid" });
        }

        // Check if pending payment already exists
        const existingPayment = await Payment.findOne({
            invoiceId: invoice._id,
            status: { $in: ["pending", "approved"] }
        });

        if (existingPayment) {
            return res.status(400).json({ message: "A payment is already processing for this invoice" });
        }

        const payment = await Payment.create({
            invoiceId: invoice._id,
            amount: invoice.grandTotal,
            method: method || "cash",
            status: "pending"
        });

        res.status(201).json({
            message: "Payment request created successfully",
            payment
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/razorpay-order/:invoiceId
// @access  Admin/Staff
exports.createRazorpayOrder = async (req, res) => {
    try {
        if (!razorpayInstance) {
            return res.status(500).json({ message: "Razorpay keys are not configured in .env" });
        }

        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const options = {
            amount: Math.round(invoice.grandTotal * 100), // Amount in paise
            currency: "INR",
            receipt: `receipt_${invoice.invoiceNumber}`
        };

        const order = await razorpayInstance.orders.create(options);

        // Auto-create a pending payment record for this razorpay order
        const payment = await Payment.create({
            invoiceId: invoice._id,
            amount: invoice.grandTotal,
            method: "razorpay",
            razorpayOrderId: order.id,
            status: "pending"
        });

        res.status(201).json({
            message: "Razorpay order created",
            order,
            payment
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve Payment & Reduce Stock
// @route   PATCH /api/payments/:id/approve
// @access  Admin Only
exports.approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        if (payment.status === "approved" || payment.status === "paid") {
            return res.status(400).json({ message: "Payment is already approved/paid" });
        }

        // Find linked invoice
        const invoice = await Invoice.findById(payment.invoiceId);
        if (!invoice) return res.status(404).json({ message: "Linked invoice not found" });

        // Update payment status
        payment.status = "approved";
        payment.approvedBy = req.user._id;
        payment.approvedAt = Date.now();
        await payment.save();

        // Update invoice status
        invoice.paymentStatus = "paid";
        await invoice.save();

        // MODULE 8: Stock Reduction Logic
        let stockLogs = [];
        for (const item of invoice.items) {
            const product = await Product.findById(item.productId);
            if (product) {
                const previousStock = product.stock;
                const newStock = previousStock - item.qty;

                // Update product stock
                product.stock = newStock;
                await product.save();

                // Create stock log entry
                const log = await StockLog.create({
                    productId: product._id,
                    invoiceId: invoice._id,
                    qtyReduced: item.qty,
                    previousStock,
                    newStock,
                    action: "sale",
                    updatedBy: req.user._id
                });
                stockLogs.push(log);

                // Low Stock Notification
                if (newStock <= 5) {
                    try {
                        const io = getIO();
                        const notification = await Notification.create({
                            userId: null, // Admin alert
                            title: "Low Stock Alert",
                            message: `Product ${product.name} is running low (${newStock} left)`,
                            type: "lowStock"
                        });
                        io.emit("lowStock", { product, notification });
                    } catch (err) {
                        console.error("Socket error on low stock:", err);
                    }
                }
            }
        }

        // Emit paymentApproved
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: invoice.createdBy,
                title: "Payment Approved",
                message: `Payment for Invoice ${invoice.invoiceNumber} has been approved`,
                type: "paymentApproved"
            });
            io.emit("paymentApproved", { payment, notification });
        } catch (err) {
            console.error("Socket error on payment approve:", err);
        }

        res.json({
            message: "Payment approved and stock updated",
            payment,
            stockLogs
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject Payment
// @route   PATCH /api/payments/:id/reject
// @access  Admin Only
exports.rejectPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        if (payment.status === "approved" || payment.status === "paid") {
            return res.status(400).json({ message: "Cannot reject an already approved payment" });
        }

        payment.status = "rejected";
        await payment.save();

        res.json({
            message: "Payment rejected successfully",
            payment
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    View all payments
// @route   GET /api/payments
// @access  Admin Only
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate("invoiceId", "invoiceNumber customerName grandTotal")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    View single payment details
// @route   GET /api/payments/:id
// @access  Admin Only
exports.getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate("invoiceId")
            .populate("approvedBy", "name email");

        if (!payment) return res.status(404).json({ message: "Payment not found" });

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
