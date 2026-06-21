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

router.use(protect);

router.route("/")
    .get(getCompanies)
    .post(
        adminOnly, 
        upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), 
        createCompany
    );

router.route("/:id")
    .get(getCompany)
    .put(
        adminOnly, 
        upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), 
        updateCompany
    )
    .delete(adminOnly, deleteCompany);

module.exports = router;
