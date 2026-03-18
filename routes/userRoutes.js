const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs'); // You need to: npm install bcryptjs

// 1. REGISTER (For Customers)
router.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        // Check if user already exists
        let emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ message: "Email already registered" });

        let phoneExists = await User.findOne({ phone });
        if (phoneExists) return res.status(400).json({ message: "Phone number already registered" });

        // HASH PASSWORD
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new customer
        const user = new User({ 
            name, 
            email, 
            phone, 
            password: hashedPassword, 
            role: 'customer' 
        });

        await user.save();
        res.status(201).json({ message: "User registered successfully", userId: user._id });
    } catch (err) {
        console.error("CRITICAL REGISTRATION ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. LOGIN (For Admin, Staff, and Customers)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check Hashed Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        // Return user data for React storage
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            creditBalance: user.creditBalance
        });
    } catch (err) {
        console.error("LOGIN ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. STAFF LIST (Moved up so it works)
router.get('/staff-list', async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' }).select('-password');
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. GET ALL USERS (Admin view)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password'); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. ADD CREDITS BY EMAIL
router.post('/add-credits', async (req, res) => {
    const { email, amount } = req.body; 
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.creditBalance += Number(amount);
        await user.save();

        res.json({ message: `Added ${amount} credits`, newBalance: user.creditBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. GET SINGLE USER DATA
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. DELETE A STAFF MEMBER
router.delete('/staff/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Staff member removed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CRITICAL: Export must be at the very bottom!
module.exports = router;