require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// --- DATABASE ---
let dbConnected = false;
const connectDB = async () => {
    if (dbConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        dbConnected = true;
    } catch (err) {
        console.log("DB connection issue - Demo Mode");
    }
};
connectDB();

// --- SCHEMAS ---
const OrderSchema = new mongoose.Schema({
    customerName: String, address: String, phone: String, city: String,
    productName: String, totalPrice: Number, date: { type: Date, default: Date.now }
});
const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

const ProductSchema = new mongoose.Schema({
    name: String, price: Number, image: String, inStock: { type: Boolean, default: true }
});
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

// --- AUTH ---
const auth = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ msg: "No token" });
    try {
        const secret = process.env.JWT_SECRET || "ismail_fallback_2026";
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) { res.status(401).json({ msg: "Invalid token" }); }
};

// --- LOGIN (Robust matching) ---
const ADMIN_EMAIL = "syedismail12570@gmail.com";
const ADMIN_PASSWORD = "Knightrider1234@";

// This matches both /api/admin/login and /admin/login for Vercel compatibility
app.post(["/api/admin/login", "/admin/login"], (req, res) => {
    const email = (req.body.email || "").toLowerCase().trim();
    const password = (req.body.password || "").trim();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "ismail_fallback_2026", { expiresIn: "24h" });
        return res.json({ token });
    }
    res.status(401).json({ msg: "Invalid email or password. Capitalization matters!" });
});

// --- API ---
app.get("/api/products", async (req, res) => { try { res.json(dbConnected ? await Product.find() : []); } catch (e) { res.json([]); } });
app.post("/api/products", auth, async (req, res) => { const p = new Product(req.body); await p.save(); res.json(p); });
app.get("/api/orders", auth, async (req, res) => { try { res.json(dbConnected ? await Order.find().sort({ date: -1 }) : []); } catch (e) { res.json([]); } });
app.post("/api/orders", async (req, res) => {
    const o = new Order({ ...req.body, totalPrice: Number(req.body.productPrice) + 300 });
    if (dbConnected) await o.save();
    res.json(o);
});

// --- FRONTEND ---
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Run on ${PORT}`));
}
module.exports = app;
