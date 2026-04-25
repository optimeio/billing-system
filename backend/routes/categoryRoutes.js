const express = require("express");
const router = express.Router();
const { 
    createCategory, 
    getCategories, 
    updateCategory, 
    deleteCategory 
} = require("../controllers/categoryController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require login
router.use(protect);

router.route("/")
    .post(createCategory)
    .get(getCategories);

router.route("/:id")
    .put(updateCategory)
    .delete(adminOnly, deleteCategory);

module.exports = router;
