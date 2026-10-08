const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Category = require("../models/Category");
const User = require("../models/User");
const Company = require("../models/Company");
const mongoose = require("mongoose");
const { generateInvoicePDF } = require("../utils/pdfGenerator");
const { findOrCreateCategory, findOrCreateProduct } = require("../utils/autoProductService");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");
const { sendEmail } = require("../utils/emailService");

// Helper to resolve companyId (whether ObjectId, slug, or name)
const resolveCompanyObjectId = async (companyIdOrSlug) => {
    if (!companyIdOrSlug) return undefined;
    
    try {
        // If it's already a valid ObjectId
        if (mongoose.isValidObjectId(companyIdOrSlug)) {
            const found = await Company.findById(companyIdOrSlug);
            if (found) return found._id;
        }

        // Try finding by name or slug
        const cleanStr = String(companyIdOrSlug).trim();
        const cleanName = cleanStr.replace(/[-_]/g, ' ');
        const foundByName = await Company.findOne({
            $or: [
                { name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                { name: new RegExp(cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
            ]
        });
        if (foundByName) return foundByName._id;
    } catch (err) {
        console.error("[Invoice] resolveCompanyObjectId error:", err.message);
    }

    return undefined;
};

// Helper to calculate the next unique sequential number for invoice or quotation
const getNextDocNumber = async (type = "invoice") => {
    const isQuotation = type === "quotation";
    const prefix = isQuotation ? "QT" : "INV";
    
    // Starting baseline: Invoice starts from at least 68 (next INV69), Quotation from at least 44 (next QT45)
    const baseMin = isQuotation ? 44 : 68;

    // Search existing documents for the highest number in the active sequence
    const allDocs = await Invoice.find({ type: isQuotation ? "quotation" : "invoice" })
        .select("invoiceNumber type")
        .lean();

    let maxNum = baseMin;

    for (const doc of allDocs) {
        if (!doc.invoiceNumber) continue;
        const raw = doc.invoiceNumber.trim().toUpperCase();

        if (isQuotation) {
            // Match QT44, QT-44, QT 44, etc. Exclude rogue 4-digit test numbers (1001-1010)
            const match = raw.match(/^QT-?\s*(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num >= 44 && num < 1000 && num > maxNum) {
                    maxNum = num;
                }
            }
        } else {
            // Match INV66, INV-66, INV 66, etc. Exclude rogue entry INV107 and 4-digit test number INV1102
            const match = raw.match(/^INV-?\s*(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num >= 66 && num !== 107 && num < 1000 && num > maxNum) {
                    maxNum = num;
                }
            }
        }
    }

    let nextNum = maxNum + 1;
    let candidate = `${prefix}${nextNum}`;

    // Loop until we find a candidate that definitely does NOT exist in DB (prevent duplicates)
    while (await Invoice.findOne({ invoiceNumber: candidate })) {
        nextNum++;
        candidate = `${prefix}${nextNum}`;
    }

    return candidate;
};

// @desc    Get next available invoice or quotation number
// @route   GET /api/invoices/next-number
// @access  Admin/Staff
exports.getNextNumber = async (req, res) => {
    try {
        const type = req.query.type || "invoice";
        const nextNumber = await getNextDocNumber(type);
        res.json({ nextNumber });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Admin/Staff
exports.createInvoice = async (req, res) => {
    try {
        let { invoiceNumber, invoiceDate, customerName, customerPhone, customerAddress, customerIdNumber, items, hsnCode = "7321", taxRate = 0, tax = 0, discount = 0, taxableValue = 0, type = "invoice", companyId, companyPhone, bankDetails, challanNumber, challanDate, amountInWords = "" } = req.body;

        customerName = customerName ? customerName.trim() : "";
        customerPhone = customerPhone ? customerPhone.trim() : "";
        customerAddress = customerAddress ? customerAddress.trim() : "";
        customerIdNumber = customerIdNumber ? customerIdNumber.trim() : "";
        hsnCode = hsnCode ? hsnCode.trim() : "7321";

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Document must have at least one item." });
        }

        // 1. Resolve Invoice Number (custom manual value or auto-generated)
        let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : "";
        if (!finalInvoiceNumber) {
            finalInvoiceNumber = await getNextDocNumber(type);
        } else {
            // Verify manual entry is unique, or auto-increment if collision
            const existing = await Invoice.findOne({ invoiceNumber: finalInvoiceNumber });
            if (existing) {
                finalInvoiceNumber = await getNextDocNumber(type);
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

            // Find product by ID if valid
            if (item.productId && mongoose.isValidObjectId(item.productId)) {
                product = await Product.findById(item.productId);
            }
            
            if (!product && (item.productName || item.name)) {
                const prodName = (item.productName || item.name).trim();
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

                const productResult = await findOrCreateProduct(prodName, categoryId, item.price || item.rate, req.user._id);
                product = productResult.product;
                if (productResult.isNew) {
                    autoCreatedProducts.push(product);
                }
            }

            if (!product && (item.productName || item.name)) {
                const prodName = (item.productName || item.name).trim();
                product = await Product.create({
                    name: prodName,
                    price: Number(item.price || item.rate) || 0,
                    stock: 0,
                    createdBy: req.user._id,
                    isAutoCreated: true
                });
            }

            if (!product) {
                return res.status(400).json({ message: `Product could not be found or created for item: ${item.productName || item.name || item.productId}` });
            }

            // Calculate totals for line item
            const itemPrice = Number(item.price !== undefined ? item.price : (item.rate !== undefined ? item.rate : product.price)) || 0;
            const itemQty = Number(item.qty) || 1;
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

        // Resolve Company ID safely to valid ObjectId or undefined
        const resolvedCompanyId = await resolveCompanyObjectId(companyId);

        // 4. Save Invoice with exact fields
        const invoice = await Invoice.create({
            invoiceNumber: finalInvoiceNumber,
            customerName,
            customerPhone,
            customerAddress,
            customerIdNumber,
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
            invoiceDate: dateToSet,
            qtyLabel: req.body.qtyLabel || "Qty",
            approvalPhoto: req.body.approvalPhoto || "",
            amountInWords: amountInWords || "",
            companyId: resolvedCompanyId,
            companyPhone: companyPhone || "",
            bankDetails: bankDetails || {},
            challanNumber: challanNumber || "",
            challanDate: challanDate || ""
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
            console.error("Socket error on invoice create:", err.message);
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
        console.error("[Invoice] createInvoice error:", error);
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
            .populate("companyId")
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Admin/Staff
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate("createdBy", "name email staffId")
            .populate("companyId")
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
    try {
        let { invoiceNumber, invoiceDate, customerName, customerPhone, customerAddress, customerIdNumber, items, hsnCode = "7321", taxRate = 0, tax = 0, discount = 0, taxableValue = 0, type = "invoice", qtyLabel, approvalPhoto, companyId, companyPhone, bankDetails, challanNumber, challanDate, amountInWords } = req.body;

        customerName = customerName ? customerName.trim() : "";
        customerPhone = customerPhone ? customerPhone.trim() : "";
        customerAddress = customerAddress ? customerAddress.trim() : "";
        customerIdNumber = customerIdNumber ? customerIdNumber.trim() : "";
        hsnCode = hsnCode ? hsnCode.trim() : "7321";

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Document must have at least one item." });
        }

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice/Quotation not found" });
        }

        // Check authorization: Admin or Creator
        if (req.user.role !== "admin" && invoice.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this document." });
        }

        // If invoice number is changed, check uniqueness
        if (invoiceNumber && invoiceNumber.trim() !== invoice.invoiceNumber) {
            const existing = await Invoice.findOne({ 
                invoiceNumber: invoiceNumber.trim(),
                _id: { $ne: invoice._id }
            });
            if (existing) {
                return res.status(400).json({ message: `Number "${invoiceNumber}" is already in use.` });
            }
            invoice.invoiceNumber = invoiceNumber.trim();
        }

        let processedItems = [];
        let subtotal = 0;

        for (let item of items) {
            let product;
            if (item.productId) {
                product = await Product.findById(item.productId);
            } else if (item.productName) {
                let categoryId = null;
                if (item.category) {
                    const categoryResult = await findOrCreateCategory(item.category);
                    if (categoryResult.category) {
                        categoryId = categoryResult.category._id;
                    }
                }
                const productResult = await findOrCreateProduct(item.productName, categoryId, item.price, req.user._id);
                product = productResult.product;
            }

            if (!product) {
                return res.status(400).json({ message: `Product could not be found or created for item: ${item.productName || item.productId}` });
            }

            const itemPrice = Number(item.price !== undefined ? item.price : (item.rate !== undefined ? item.rate : product.price)) || 0;
            const itemQty = Number(item.qty) || 1;
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

        const grandTotal = subtotal + parseFloat(tax) - parseFloat(discount);

        invoice.customerName = customerName;
        invoice.customerPhone = customerPhone;
        invoice.customerAddress = customerAddress;
        invoice.customerIdNumber = customerIdNumber;
        invoice.items = processedItems;
        invoice.subtotal = subtotal;
        invoice.taxableValue = parseFloat(taxableValue) || 0;
        invoice.hsnCode = hsnCode;
        invoice.taxRate = Number(taxRate) || 0;
        invoice.tax = Number(tax) || 0;
        invoice.discount = Number(discount) || 0;
        invoice.grandTotal = grandTotal;
        invoice.invoiceDate = invoiceDate ? new Date(invoiceDate) : invoice.invoiceDate;
        if (qtyLabel) invoice.qtyLabel = qtyLabel;
        if (approvalPhoto !== undefined) invoice.approvalPhoto = approvalPhoto;
        if (amountInWords !== undefined) invoice.amountInWords = amountInWords;
        
        if (companyId) {
            const resolvedCompanyId = await resolveCompanyObjectId(companyId);
            if (resolvedCompanyId) {
                invoice.companyId = resolvedCompanyId;
            }
        }
        
        if (companyPhone !== undefined) invoice.companyPhone = companyPhone;
        if (bankDetails !== undefined) invoice.bankDetails = bankDetails;
        if (challanNumber !== undefined) invoice.challanNumber = challanNumber;
        if (challanDate !== undefined) invoice.challanDate = challanDate;

        await invoice.save();

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on invoice update:", err.message);
        }

        res.json({ message: `${type === 'quotation' ? 'Quotation' : 'Invoice'} updated successfully`, invoice });
    } catch (error) {
        console.error("[Invoice] updateInvoice error:", error);
        res.status(500).json({ message: error.message });
    }
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

// @desc    Update invoice approval photo
// @route   PATCH /api/invoices/:id/approval-photo
exports.updateApprovalPhoto = async (req, res) => {
    try {
        const { approvalPhoto } = req.body;
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Authorization: Admin or Creator
        if (req.user.role !== "admin" && invoice.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to update this document." });
        }

        invoice.approvalPhoto = approvalPhoto || "";
        await invoice.save();

        try {
            const io = getIO();
            io.emit("invoiceUpdated", invoice);
        } catch (err) {
            console.error("Socket error on approval photo update:", err);
        }

        res.json({ message: "Approval photo updated successfully", invoice });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

