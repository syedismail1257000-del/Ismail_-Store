const router = require("express").Router();
const Product = require("../models/Product");
const auth = require("../middleware/auth");

// Get products
router.get("/", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add product (Admin only)
router.post("/", auth, async (req, res) => {
    const { name, price, image } = req.body;
    const product = new Product({ name, price, image });
    try {
        await product.save();
        res.json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
