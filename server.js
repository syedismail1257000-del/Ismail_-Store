require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const mockProducts = [
    { _id: "m1", name: "Luxury Chronograph", price: 45000, image: "https://images.unsplash.com/photo-1547996160-81dfa63595dd?w=800&q=80", inStock: true },
    { _id: "m2", name: "Premium Audio Pro", price: 32000, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", inStock: true },
    { _id: "m3", name: "Smart Flagship S24 Pro", price: 185000, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80", inStock: false }
];

let sessionProducts = [...mockProducts];
let sessionOrders = [];

// Improved MongoDB Connection for Vercel
let dbConnected = false;
const connectDB = async () => {
    if (dbConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");
        dbConnected = true;
    } catch (err) {
        console.log("MongoDB Connection Failed - Using In-Memory Storage (Demo Mode)");
    }
};
connectDB();

// Order Schema - Fixed for OverwriteModelError
const OrderSchema = new mongoose.Schema({
    customerName: String,
    address: String,
    phone: String,
    city: String,
    productName: String,
    totalPrice: Number,
    date: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

app.use("/api/admin", require("./routes/admin"));

// Middleware to ensure DB is connected for API calls
app.use(async (req, res, next) => {
    if (!dbConnected && process.env.MONGO_URI) {
        await connectDB();
    }
    next();
});

// --- Product Routes ---
app.get("/api/products", async (req, res) => {
    if (dbConnected) {
        try {
            const Product = require("./models/Product");
            const dbProducts = await Product.find();
            return res.json([...dbProducts, ...sessionProducts.filter(sp => !sp._id.toString().startsWith("m"))]);
        } catch (err) {
            return res.json(sessionProducts);
        }
    }
    res.json(sessionProducts);
});

app.post("/api/products", require("./middleware/auth"), async (req, res) => {
    const { name, price, image } = req.body;
    if (dbConnected) {
        try {
            const Product = require("./models/Product");
            const product = new Product({ name, price, image, inStock: true });
            await product.save();
            return res.json(product);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    const newProduct = { _id: "s" + Date.now(), name, price, image, inStock: true };
    sessionProducts.unshift(newProduct);
    res.json(newProduct);
});

app.patch("/api/products/:id/stock", require("./middleware/auth"), async (req, res) => {
    const { id } = req.params;
    if (dbConnected && !id.startsWith("s") && !id.startsWith("m")) {
        try {
            const Product = require("./models/Product");
            const product = await Product.findById(id);
            if (product) {
                product.inStock = !product.inStock;
                await product.save();
                return res.json(product);
            }
        } catch (err) { }
    }
    const product = sessionProducts.find(p => p._id === id);
    if (product) {
        product.inStock = !product.inStock;
        return res.json(product);
    }
    res.status(404).json({ message: "Product not found" });
});

app.delete("/api/products/:id", require("./middleware/auth"), async (req, res) => {
    const { id } = req.params;
    if (dbConnected && !id.startsWith("s") && !id.startsWith("m")) {
        try {
            const Product = require("./models/Product");
            await Product.findByIdAndDelete(id);
            return res.json({ message: "Deleted" });
        } catch (err) { }
    }
    const index = sessionProducts.findIndex(p => p._id === id);
    if (index !== -1) {
        sessionProducts.splice(index, 1);
        return res.json({ message: "Deleted from session" });
    }
    res.status(404).json({ message: "Product not found" });
});

// --- Order Routes ---
app.post("/api/orders", async (req, res) => {
    const { customerName, address, phone, city, productName, productPrice } = req.body;
    const totalPrice = Number(productPrice) + 300; // Rs 300 COD Fee

    if (dbConnected) {
        try {
            const order = new Order({ customerName, address, phone, city, productName, totalPrice });
            await order.save();
            return res.json(order);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }

    // Fallback: Add to memory
    const newOrder = {
        _id: "o" + Date.now(),
        customerName, address, phone, city, productName, totalPrice,
        date: new Date()
    };
    sessionOrders.unshift(newOrder);
    res.json(newOrder);
});

app.get("/api/orders", require("./middleware/auth"), async (req, res) => {
    if (dbConnected) {
        try {
            const dbOrders = await Order.find().sort({ date: -1 });
            return res.json([...dbOrders, ...sessionOrders]);
        } catch (err) {
            return res.json(sessionOrders);
        }
    }
    res.json(sessionOrders);
});

// Serve frontend fallback
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
