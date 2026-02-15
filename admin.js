const router = require("express").Router();
const jwt = require("jsonwebtoken");

// Secure credentials for Ismail Store
const ADMIN_EMAIL = "syedismail12570@gmail.com";
const ADMIN_PASSWORD = "Knightrider1234@";

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign(
            { role: "admin" },
            process.env.JWT_SECRET || "ismail_fallback_secret",
            { expiresIn: "24h" }
        );
        return res.json({ token });
    }

    res.status(401).json({ msg: "Invalid credentials" });
});

module.exports = router;
