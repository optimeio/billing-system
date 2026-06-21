const express = require("express");
const router = express.Router();
const { 
    createProduct, 
    getProducts, 
    getProductById, 
    getProductByBarcode, 
    updateProduct, 
    deleteProduct 
} = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes require login
router.use(protect);

router.post("/upload-image", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Please upload an image" });
    }
    res.json({ imagePath: `/uploads/${req.file.filename}` });
});

router.route("/")
    .post(createProduct)
    .get(getProducts);

router.get("/barcode/:barcode", getProductByBarcode);

router.route("/:id")
    .get(getProductById)
    .put(updateProduct)
    .delete(adminOnly, deleteProduct);

module.exports = router;
