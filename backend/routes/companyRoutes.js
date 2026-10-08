const express = require("express");
const router = express.Router();
const {
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany
} = require("../controllers/companyController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// GET routes are open for billing/invoice printing and template loading
router.route("/")
    .get(getCompanies)
    .post(
        protect,
        adminOnly, 
        upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), 
        createCompany
    );

router.route("/:id")
    .get(getCompany)
    .put(
        protect,
        adminOnly, 
        upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), 
        updateCompany
    )
    .post(
        protect,
        adminOnly, 
        upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), 
        updateCompany
    )
    .delete(protect, adminOnly, deleteCompany);

module.exports = router;

