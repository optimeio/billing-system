const express = require("express");
const router = express.Router();
const { 
    createAnnouncement, 
    getAnnouncements, 
    addReply 
} = require("../controllers/announcementController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getAnnouncements);
router.post("/reply/:id", addReply);
router.post("/", adminOnly, createAnnouncement);

module.exports = router;
