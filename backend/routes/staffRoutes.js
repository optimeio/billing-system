const express = require("express");
const router = express.Router();
const { 
    createStaff, 
    getAllStaff, 
    getStaffById,
    updateStaff,
    deleteStaff,
    blockStaff, 
    unblockStaff 
} = require("../controllers/staffController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes here are admin only
router.use(protect);
router.use(adminOnly);

router.post("/create", createStaff);
router.get("/all", getAllStaff);
router.get("/:id", getStaffById);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);
router.patch("/block/:id", blockStaff);
router.patch("/unblock/:id", unblockStaff);

module.exports = router;
