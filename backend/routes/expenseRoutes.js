const express = require("express");
const router = express.Router();
const { 
    createExpense, 
    getExpenses, 
    getExpenseById, 
    approveExpense, 
    rejectExpense, 
    deleteExpense 
} = require("../controllers/expenseController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(verifyToken);

router.post("/", upload.single("file"), createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.delete("/:id", deleteExpense);

// Admin only actions
router.patch("/:id/approve", authorizeRoles("admin"), approveExpense);
router.patch("/:id/reject", authorizeRoles("admin"), rejectExpense);

module.exports = router;
