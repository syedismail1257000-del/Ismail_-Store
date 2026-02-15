const router = require("express").Router();
const jwt = require("jsonwebtoken");

// Simple hardcoded admin for demonstration
const ADMIN_EMAIL = "admin@pkrstore.com";
const ADMIN_PASSWORD = "password123";

router.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
        return res.json({ token });
    }
    res.status(401).json({ msg: "Invalid credentials" });
});

module.exports = router;
