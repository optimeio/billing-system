const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { generateInvoicePDF } = require("../utils/pdfGenerator");

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Admin/Staff
exports.createInvoice = async (req, res) => {
    try {
        const { customerName, customerPhone, items, tax = 0, discount = 0 } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Invoice must have at least one item." });
        }

        // 1. Generate Invoice Number (INV1001, INV1002...)
        const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
        let nextInvoiceNumber = "INV1001";
        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNum = parseInt(lastInvoice.invoiceNumber.replace("INV", ""));
            nextInvoiceNumber = `INV${lastNum + 1}`;
        }

        let processedItems = [];
        let subtotal = 0;

        // 2. Process each item
        for (let item of items) {
            let product;

            // Find product by ID or Name
            if (item.productId) {
                product = await Product.findById(item.productId);
            } else if (item.productName) {
                product = await Product.findOne({ name: { $regex: new RegExp(`^${item.productName}$`, "i") } });
            }

            // If product doesn't exist, create it auto
            if (!product) {
                let categoryId = null;
                
                // Handle Category auto-creation if provided
                if (item.category) {
                    let category = await Category.findOne({ name: { $regex: new RegExp(`^${item.category}$`, "i") } });
                    if (!category) {
                        category = await Category.create({ name: item.category });
                    }
                    categoryId = category._id;
                }

                product = await Product.create({
                    name: item.productName || "Unnamed Product",
                    price: item.price || 0,
                    stock: 0, // Default stock as requested
                    category: categoryId,
                    unit: item.unit || "pcs"
                });
            }

            // Calculate totals for line item
            const itemPrice = item.price || product.price;
            const itemQty = item.qty || 1;
            const itemTotal = itemPrice * itemQty;

            processedItems.push({
                productId: product._id,
                name: product.name,
                price: itemPrice,
                qty: itemQty,
                total: itemTotal
            });

            subtotal += itemTotal;
        }

        // 3. Final Calculations
        const grandTotal = subtotal + parseFloat(tax) - parseFloat(discount);

        // 4. Save Invoice
        const invoice = await Invoice.create({
            invoiceNumber: nextInvoiceNumber,
            customerName,
            customerPhone,
            items: processedItems,
            subtotal,
            tax,
            discount,
            grandTotal,
            createdBy: req.user._id
        });

        res.status(201).json({
            message: "Invoice created successfully",
            invoice
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Admin/Staff
exports.getInvoices = async (req, res) => {
    try {
        let query = {};
        
        // Staff can only see their own invoices
        if (req.user.role !== "admin") {
            query.createdBy = req.user._id;
        }

        const invoices = await Invoice.find(query)
            .populate("createdBy", "name email staffId")
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("createdBy", "name email staffId")
            .populate("items.productId", "name barcode category");

        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Check permission: Admin or Creator
        if (req.user.role !== "admin" && invoice.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to view this invoice" });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel invoice
// @route   PATCH /api/invoices/:id/cancel
exports.cancelInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Check permission: Admin or Creator
        if (req.user.role !== "admin" && invoice.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to cancel this invoice" });
        }

        invoice.paymentStatus = "cancelled";
        await invoice.save();

        res.json({ message: "Invoice cancelled successfully", invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Invoice PDF
// @route   GET /api/invoices/:id/download
exports.downloadInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Set response headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`
        );

        generateInvoicePDF(invoice, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
