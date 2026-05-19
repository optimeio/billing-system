const express = require("express");
const router = express.Router();
const { getMyProfile, updateMyProfile, uploadProfilePic } = require("../controllers/profileController");
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(verifyToken);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/upload-pic", upload.single("profilePic"), uploadProfilePic);

module.exports = router;
