const Company = require("../models/Company");

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find();
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
const getCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a company
// @route   POST /api/companies
// @access  Private/Admin
const createCompany = async (req, res) => {
    try {
        const { name, address, gst, phone, email, bankDetails, themeColor } = req.body;
        
        let logo = "";
        let signature = "";

        if (req.files) {
            if (req.files.logo && req.files.logo.length > 0) {
                logo = `/uploads/${req.files.logo[0].filename}`;
            }
            if (req.files.signature && req.files.signature.length > 0) {
                signature = `/uploads/${req.files.signature[0].filename}`;
            }
        }

        let parsedBankDetails = {};
        if (bankDetails) {
            try {
                parsedBankDetails = typeof bankDetails === 'string' ? JSON.parse(bankDetails) : bankDetails;
            } catch (e) {
                console.error("Failed to parse bank details");
            }
        }

        const company = await Company.create({
            name,
            address,
            gst,
            phone,
            email,
            bankDetails: parsedBankDetails,
            themeColor,
            logo,
            signature
        });

        res.status(201).json(company);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private/Admin
const updateCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        let updatedData = { ...req.body };

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

        const updatedCompany = await Company.findByIdAndUpdate(req.params.id, updatedData, {
            new: true,
            runValidators: true
        });

        res.status(200).json(updatedCompany);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private/Admin
const deleteCompany = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);

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
