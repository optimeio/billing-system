const Company = require("../models/Company");
const mongoose = require("mongoose");
const defaultCompanies = require("../utils/defaultCompanies");

// Helper to seed default companies if DB is empty
const seedIfEmpty = async () => {
    try {
        const count = await Company.countDocuments();
        if (count === 0) {
            console.log("[Company] Database is empty, seeding default companies...");
            await Company.insertMany(defaultCompanies);
        }
    } catch (e) {
        console.error("[Company] Seeding error:", e.message);
    }
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public / Private
const getCompanies = async (req, res) => {
    try {
        let companies = await Company.find().sort({ createdAt: 1 });
        if (!companies || companies.length === 0) {
            await seedIfEmpty();
            companies = await Company.find().sort({ createdAt: 1 });
        }
        res.status(200).json(companies);
    } catch (error) {
        console.error("[Company] getCompanies error:", error);
        // Fallback to default companies in-memory if DB issue
        res.status(200).json(defaultCompanies);
    }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Public / Private
const getCompany = async (req, res) => {
    try {
        const idOrName = req.params.id;
        let company = null;

        if (mongoose.isValidObjectId(idOrName)) {
            company = await Company.findById(idOrName);
        }

        if (!company) {
            // Find by name case-insensitive
            const cleanName = idOrName.replace(/[-_]/g, ' ');
            company = await Company.findOne({
                $or: [
                    { name: new RegExp(`^${cleanName}$`, 'i') },
                    { name: new RegExp(cleanName, 'i') }
                ]
            });
        }

        if (!company) {
            const fallback = defaultCompanies.find(c => 
                c.name.toLowerCase() === idOrName.toLowerCase() ||
                c.name.toLowerCase().includes(idOrName.toLowerCase())
            );
            if (fallback) {
                return res.status(200).json(fallback);
            }
            return res.status(404).json({ message: "Company not found" });
        }

        res.status(200).json(company);
    } catch (error) {
        console.error("[Company] getCompany error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a company
// @route   POST /api/companies
// @access  Private/Admin
const createCompany = async (req, res) => {
    try {
        const { name, address, gst, phone, email, bankDetails, themeColor, defaultHsn, defaultGstRate, defaultDiscount } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Company name is required." });
        }

        let logo = req.body.logo || "";
        let signature = req.body.signature || "";

        if (req.files) {
            if (req.files.logo && req.files.logo.length > 0) {
                logo = `/uploads/${req.files.logo[0].filename}`;
            }
            if (req.files.signature && req.files.signature.length > 0) {
                signature = `/uploads/${req.files.signature[0].filename}`;
            }
        }

        if (req.body.deleteLogo === 'true' || req.body.deleteLogo === true) logo = "";
        if (req.body.deleteSignature === 'true' || req.body.deleteSignature === true) signature = "";

        let parsedBankDetails = {};
        if (bankDetails) {
            try {
                parsedBankDetails = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;
            } catch (e) {
                console.error("Failed to parse bank details");
            }
        }

        // Upsert by name to prevent 400 duplicate key error
        const existingCompany = await Company.findOne({ name: name.trim() });
        if (existingCompany) {
            existingCompany.address = address || existingCompany.address;
            existingCompany.gst = gst || existingCompany.gst;
            existingCompany.phone = phone || existingCompany.phone;
            existingCompany.email = email || existingCompany.email;
            if (Object.keys(parsedBankDetails).length > 0) existingCompany.bankDetails = parsedBankDetails;
            if (themeColor) existingCompany.themeColor = themeColor;
            if (defaultHsn) existingCompany.defaultHsn = String(defaultHsn).trim();
            if (defaultGstRate !== undefined && defaultGstRate !== "") existingCompany.defaultGstRate = Number(defaultGstRate);
            if (defaultDiscount !== undefined && defaultDiscount !== "") existingCompany.defaultDiscount = Number(defaultDiscount);
            if (logo) existingCompany.logo = logo;
            if (signature) existingCompany.signature = signature;

            await existingCompany.save();
            return res.status(200).json(existingCompany);
        }

        const company = await Company.create({
            name: name.trim(),
            address,
            gst,
            phone,
            email,
            bankDetails: parsedBankDetails,
            themeColor,
            defaultHsn: defaultHsn ? String(defaultHsn).trim() : "7321",
            defaultGstRate: defaultGstRate !== undefined && defaultGstRate !== "" ? Number(defaultGstRate) : 0,
            defaultDiscount: defaultDiscount !== undefined && defaultDiscount !== "" ? Number(defaultDiscount) : 0,
            logo,
            signature
        });

        res.status(201).json(company);
    } catch (error) {
        console.error("[Company] createCompany error:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private/Admin
const updateCompany = async (req, res) => {
    try {
        const id = req.params.id;
        let company = null;

        if (mongoose.isValidObjectId(id)) {
            company = await Company.findById(id);
        }
        if (!company && req.body.name) {
            company = await Company.findOne({ name: req.body.name.trim() });
        }

        if (!company) {
            // If not found in DB, try to create it as a new company
            return createCompany(req, res);
        }

        let updatedData = { ...req.body };

        if (updatedData.defaultHsn !== undefined) {
            updatedData.defaultHsn = String(updatedData.defaultHsn).trim() || "7321";
        }
        if (updatedData.defaultGstRate !== undefined && updatedData.defaultGstRate !== "") {
            updatedData.defaultGstRate = Number(updatedData.defaultGstRate) || 0;
        }
        if (updatedData.defaultDiscount !== undefined && updatedData.defaultDiscount !== "") {
            updatedData.defaultDiscount = Number(updatedData.defaultDiscount) || 0;
        }

        if (updatedData.bankDetails) {
            try {
                updatedData.bankDetails = typeof updatedData.bankDetails === 'string' ? JSON.parse(updatedData.bankDetails) : updatedData.bankDetails;
            } catch (e) {
                console.error("Failed to parse bank details");
            }
        }

        if (req.files) {
            if (req.files.logo && req.files.logo.length > 0) {
                updatedData.logo = `/uploads/${req.files.logo[0].filename}`;
            }
            if (req.files.signature && req.files.signature.length > 0) {
                updatedData.signature = `/uploads/${req.files.signature[0].filename}`;
            }
        }

        if (req.body.deleteLogo === 'true' || req.body.deleteLogo === true) {
            updatedData.logo = "";
        }
        if (req.body.deleteSignature === 'true' || req.body.deleteSignature === true) {
            updatedData.signature = "";
        }

        const updatedCompany = await Company.findByIdAndUpdate(company._id, updatedData, {
            new: true,
            runValidators: true
        });

        res.status(200).json(updatedCompany);
    } catch (error) {
        console.error("[Company] updateCompany error:", error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private/Admin
const deleteCompany = async (req, res) => {
    try {
        const id = req.params.id;
        let company = null;
        if (mongoose.isValidObjectId(id)) {
            company = await Company.findById(id);
        }
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        await company.deleteOne();
        res.status(200).json({ id: req.params.id, message: "Company deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany
};
