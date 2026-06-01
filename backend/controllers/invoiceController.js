const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { generateInvoicePDF } = require("../utils/pdfGenerator");
const { findOrCreateCategory, findOrCreateProduct } = require("../utils/autoProductService");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");
const { sendEmail } = require("../utils/emailService");


// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Admin/Staff
exports.createInvoice = async (req, res) => {
    try {
        let { customerName, customerPhone, customerAddress, items, tax = 0, discount = 0 } = req.body;

        customerName = customerName || "Walk-in Customer";
        customerPhone = customerPhone || "0000000000";
        customerAddress = customerAddress || "";

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
        let autoCreatedProducts = [];
        let autoCreatedCategories = [];

        // 2. Process each item
        for (let item of items) {
            let product;

            // Find product by ID
            if (item.productId) {
                product = await Product.findById(item.productId);
            } else if (item.productName) {
                let categoryId = null;
                
                // Handle Category auto-creation if provided
                if (item.category) {
                    const categoryResult = await findOrCreateCategory(item.category);
                    if (categoryResult.category) {
                        categoryId = categoryResult.category._id;
                        if (categoryResult.isNew) {
                            autoCreatedCategories.push(categoryResult.category);
                        }
                    }
                }

                const productResult = await findOrCreateProduct(item.productName, categoryId, item.price, req.user._id);
                product = productResult.product;
                if (productResult.isNew) {
                    autoCreatedProducts.push(product);
                }
            }

            if (!product) {
                return res.status(400).json({ message: `Product could not be found or created for item: ${item.productName || item.productId}` });
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
            customerAddress,
            items: processedItems,
            subtotal,
            tax,
            discount,
            grandTotal,
            createdBy: req.user._id
        });

        // 5. Emit socket event and create notification
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: null, // Global notification for Admin
                title: "New Invoice Created",
                message: `Invoice ${invoice.invoiceNumber} created by ${req.user.name || "Staff"}`,
                type: "invoiceCreated"
            });
            io.emit("invoiceCreated", { invoice, notification });
        } catch (err) {
            console.error("Socket error on invoice create:", err);
        }

        // 6. Send Email Notification to Admin
        const adminEmailMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2c3e50;">New Invoice Generated</h2>
                <p>An invoice has been successfully created in the system:</p>
                <ul>
                    <li><b>Invoice Number:</b> ${invoice.invoiceNumber}</li>
                    <li><b>Customer Name:</b> ${customerName}</li>
                    <li><b>Grand Total:</b> ₹${grandTotal.toLocaleString()}</li>
                    <li><b>Created By:</b> ${req.user.name || "Staff"}</li>
                </ul>
                <p>Please log in to the admin portal to review the invoice details.</p>
            </div>
        `;

        // Send Email Notification to Admin in the background (non-blocking)
        sendEmail(process.env.EMAIL_USER, `New Invoice Created: ${invoice.invoiceNumber}`, "", adminEmailMessage)
            .catch(emailErr => console.error("Failed to send admin notification email for invoice:", emailErr.message));


        res.status(201).json({
            message: "Invoice created successfully",
            autoCreatedProducts,
            autoCreatedCategories,
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

// @desc    Mark invoice as paid (Admin Only)
// @route   PATCH /api/invoices/:id/paid
exports.markInvoiceAsPaid = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Only Admin can manually override payment status
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can manually mark invoices as paid" });
        }

        invoice.paymentStatus = "paid";
        await invoice.save();

        res.json({ message: "Invoice marked as PAID successfully", invoice });
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

        await generateInvoicePDF(invoice, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Delete invoice (Admin Only)
// @route   DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Restriction: Only Admin can delete invoices for financial record integrity
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can permanently delete invoices" });
        }

        await Invoice.findByIdAndDelete(req.params.id);
        res.json({ message: "Invoice deleted permanently" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
