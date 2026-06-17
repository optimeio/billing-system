const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
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
        let { invoiceNumber, invoiceDate, customerName, customerPhone, customerAddress, items, hsnCode = "", taxRate = 0, tax = 0, discount = 0, taxableValue = 0, type = "invoice" } = req.body;

        customerName = customerName ? customerName.trim() : "";
        customerPhone = customerPhone ? customerPhone.trim() : "";
        customerAddress = customerAddress ? customerAddress.trim() : "";
        hsnCode = hsnCode ? hsnCode.trim() : "";

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Document must have at least one item." });
        }

        // 1. Resolve Invoice Number (custom manual value or auto-generated)
        let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : "";
        if (!finalInvoiceNumber) {
            const prefix = type === "quotation" ? "QT" : "INV";
            // Search ALL invoices for highest number with this prefix (ignore type field)
            const allDocs = await Invoice.find({}).select("invoiceNumber").lean();

            let maxNum = 1000;
            for (const doc of allDocs) {
                if (doc.invoiceNumber && doc.invoiceNumber.startsWith(prefix)) {
                    const num = parseInt(doc.invoiceNumber.replace(prefix, ""), 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            }
            finalInvoiceNumber = `${prefix}${maxNum + 1}`;
        } else {
            // Verify manual entry is unique
            const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
            if (existing) {
                return res.status(400).json({ message: `Number "${finalInvoiceNumber}" is already in use.` });
            }
        }

        const dateToSet = invoiceDate ? new Date(invoiceDate) : new Date();

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

        // 4. Save Invoice with exact fields
        const invoice = await Invoice.create({
            invoiceNumber: finalInvoiceNumber,
            customerName,
            customerPhone,
            customerAddress,
            items: processedItems,
            subtotal,
            taxableValue: parseFloat(taxableValue) || 0,
            hsnCode,
            taxRate,
            tax,
            discount,
            grandTotal,
            type,
            createdBy: req.user._id,
            createdAt: dateToSet
        });

        // 5. Emit socket event and create notification
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: null, // Global notification for Admin
                title: type === "quotation" ? "New Quotation Created" : "New Invoice Created",
                message: `${type === 'quotation' ? 'Quotation' : 'Invoice'} ${invoice.invoiceNumber} created by ${req.user.name || "Staff"}`,
                type: "invoiceCreated"
            });
            io.emit("invoiceCreated", { invoice, notification });
        } catch (err) {
            console.error("Socket error on invoice create:", err);
        }

        // 6. Send Email Notification to Admin
        const docName = type === "quotation" ? "Quotation" : "Invoice";
        const adminEmailMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2c3e50;">New ${docName} Generated</h2>
                <p>A new ${type} has been successfully created in the system:</p>
                <ul>
                    <li><b>${docName} Number:</b> ${invoice.invoiceNumber}</li>
                    <li><b>Customer Name:</b> ${customerName}</li>
                    <li><b>Grand Total:</b> ₹${grandTotal.toLocaleString()}</li>
                    <li><b>Created By:</b> ${req.user.name || "Staff"}</li>
                </ul>
                <p>Please log in to the admin portal to review the details.</p>
            </div>
        `;

        // Send Email Notification to Admin in the background (non-blocking)
        sendEmail(process.env.EMAIL_USER, `New ${docName} Created: ${invoice.invoiceNumber}`, "", adminEmailMessage)
            .catch(emailErr => console.error(`Failed to send admin notification email for ${type}:`, emailErr.message));


        res.status(201).json({
            message: `${docName} created successfully`,
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
        const type = req.query.type || "invoice";
        let query = { type };
        
        // Staff see all quotations, but only their own invoices
        if (req.user.role !== "admin" && type !== "quotation") {
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

        // Permission: Admin can view all. Staff can view all quotations + their own invoices.
        if (req.user.role !== "admin") {
            const isCreator = invoice.createdBy && invoice.createdBy._id.toString() === req.user._id.toString();
            const isQuotation = invoice.type === "quotation";
            if (!isCreator && !isQuotation) {
                return res.status(403).json({ message: "Not authorized to view this invoice" });
            }
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

        // Send Email Notification to Staff Creator
        try {
            const creator = await User.findById(invoice.createdBy).select("name email");
            if (creator && creator.email) {
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
                        <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Invoice Cancelled</p>
                      </div>
                      <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${creator.name}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your created invoice <strong>${invoice.invoiceNumber}</strong> has been <strong style="color: #dc2626;">CANCELLED</strong> by the administrator. Below are the details:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                          <tbody>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Invoice Number</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${invoice.invoiceNumber}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Customer Name</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${invoice.customerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Grand Total</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: bold;">₹${parseFloat(invoice.grandTotal).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Status</td>
                              <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: bold;">CANCELLED</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                `;
                sendEmail(creator.email, `Invoice Cancelled: ${invoice.invoiceNumber}`, "", emailHtml)
                    .catch(emailErr => console.error("Failed to send invoice cancellation email:", emailErr.message));
            }
        } catch (fetchErr) {
            console.error("Failed to fetch creator for email notification:", fetchErr.message);
        }

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on invoice cancel:", err);
        }

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

        // Send Email Notification to Staff Creator
        try {
            const creator = await User.findById(invoice.createdBy).select("name email");
            if (creator && creator.email) {
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
                        <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Invoice Approved / Paid</p>
                      </div>
                      <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${creator.name}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your created invoice <strong>${invoice.invoiceNumber}</strong> has been <strong>APPROVED</strong> and marked as <strong>PAID</strong> by the administrator. Below are the details:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                          <tbody>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Invoice Number</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${invoice.invoiceNumber}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Customer Name</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${invoice.customerName}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Grand Total</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: bold;">₹${parseFloat(invoice.grandTotal).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Status</td>
                              <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: bold;">PAID</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                `;
                sendEmail(creator.email, `Invoice Approved/Paid: ${invoice.invoiceNumber}`, "", emailHtml)
                    .catch(emailErr => console.error("Failed to send invoice paid email:", emailErr.message));
            }
        } catch (fetchErr) {
            console.error("Failed to fetch creator for email notification:", fetchErr.message);
        }

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on invoice mark paid:", err);
        }

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
            return res.status(404).json({ message: "Document not found" });
        }

        const { generateQuotationPDF } = require("../utils/pdfGenerator");

        // Set response headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        const filenamePrefix = invoice.type === "quotation" ? "Quotation" : "Invoice";
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${filenamePrefix}_${invoice.invoiceNumber}.pdf`
        );

        if (invoice.type === "quotation") {
            await generateQuotationPDF(invoice, res);
        } else {
            await generateInvoicePDF(invoice, res);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Delete invoice (Admin or Creator)
// @route   DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Restriction: Admin or Creator can delete
        if (req.user.role !== "admin" && invoice.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to delete this invoice" });
        }

        await Invoice.findByIdAndDelete(req.params.id);

        try {
            const io = getIO();
            io.emit("invoiceDeleted", { id: req.params.id });
        } catch (err) {
            console.error("Socket error on invoice delete:", err);
        }

        res.json({ message: "Invoice deleted permanently" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update/Edit existing invoice
// @route   PUT /api/invoices/:id
// @access  Admin/Staff
exports.updateInvoice = async (req, res) => {
    return res.status(400).json({ message: "Invoices and quotations are non-editable once created." });
};

// @desc    Approve Quotation (Admin Only)
// @route   PATCH /api/invoices/:id/approve-quotation
exports.approveQuotation = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice || invoice.type !== "quotation") {
            return res.status(404).json({ message: "Quotation not found" });
        }
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can approve quotations" });
        }
        invoice.paymentStatus = "approved";
        await invoice.save();

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on quotation approve:", err);
        }

        res.json({ message: "Quotation approved successfully", invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject Quotation (Admin Only)
// @route   PATCH /api/invoices/:id/reject-quotation
exports.rejectQuotation = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice || invoice.type !== "quotation") {
            return res.status(404).json({ message: "Quotation not found" });
        }
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only administrators can reject quotations" });
        }
        invoice.paymentStatus = "rejected";
        await invoice.save();

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on quotation reject:", err);
        }

        res.json({ message: "Quotation rejected successfully", invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
