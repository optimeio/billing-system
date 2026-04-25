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

// All routes require login
router.use(protect);

router.route("/")
    .post(createProduct)
    .get(getProducts);

router.get("/barcode/:barcode", getProductByBarcode);

router.route("/:id")
    .get(getProductById)
    .put(updateProduct)
    .delete(adminOnly, deleteProduct);

module.exports = router;
