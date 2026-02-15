require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

// --- DATABASE ---
let dbConnected = false;
const connectDB = async () => {
    if (dbConnected || !process.env.MONGO_URI) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        dbConnected = true;
    } catch (err) { console.log("DB Error"); }
};
connectDB();

// --- SCHEMAS ---
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    customerName: String, address: String, phone: String, city: String,
    productName: String, totalPrice: Number, date: { type: Date, default: Date.now }
}));

const Product = mongoose.models.Product || mongoose.model("Product", new mongoose.Schema({
    name: String, price: Number, image: String, inStock: { type: Boolean, default: true }
}));

// --- ADMIN CREDENTIALS ---
const ADMIN_EMAIL = "syedismail12570@gmail.com";
const ADMIN_PASSWORD = "Knightrider1234@";

// --- ROUTES ---
app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body;
    if (email.toLowerCase().trim() === ADMIN_EMAIL && password.trim() === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "ismail_2026", { expiresIn: "24h" });
        return res.json({ token });
    }
    res.status(401).json({ msg: "Invalid credentials" });
});

app.get("/api/products", async (req, res) => {
    const products = dbConnected ? await Product.find() : [];
    res.json(products);
});

app.post("/api/orders", async (req, res) => {
    const order = new Order({ ...req.body, totalPrice: Number(req.body.productPrice) + 300 });
    if (dbConnected) await order.save();
    res.json(order);
});

// Admin Protected Routes
const auth = (req, res, next) => {
    const token = req.header("Authorization");
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "ismail_2026");
        req.user = decoded;
        next();
    } catch (e) { res.status(401).send(); }
};

app.get("/api/orders", auth, async (req, res) => {
    res.json(dbConnected ? await Order.find().sort({date: -1}) : []);
});

app.post("/api/products", auth, async (req, res) => {
    const p = new Product(req.body); await p.save(); res.json(p);
});

app.delete("/api/products/:id", auth, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id); res.json({msg: "deleted"});
});

// --- SERVE FRONTEND ---
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

module.exports = app;
