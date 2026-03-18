const express = require('express');
const router = express.Router();
const User = require('../models/user');

// 1. REGISTER (For Customers)
router.post('/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        // Check if user already exists
        let userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "Email already registered" });

        // Create new customer
        const user = new User({ 
            name, 
            email, 
            phone, 
            password, // Note: In a real app, hash this using bcrypt
            role: 'customer' 
        });

        await user.save();
        res.status(201).json(user);
    } catch (err) {
    console.error("CRITICAL REGISTRATION ERROR:", err.message);
    console.error(err); // This will print the full technical reason in Render Logs
    res.status(500).json({ error: err.message });
}
});

// 2. LOGIN (For Admin, Staff, and Customers)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check Password
        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Return user data (React will use the 'role' to redirect)
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            creditBalance: user.creditBalance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. GET ALL USERS (Admin view)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password'); 
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. ADD CREDITS BY EMAIL (Admin action)
router.post('/add-credits', async (req, res) => {
    const { email, amount } = req.body; 
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        user.creditBalance += Number(amount);
        await user.save();

        res.json({ 
            message: `Added ${amount} credits to ${user.name}`, 
            newBalance: user.creditBalance 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. GET SINGLE USER DATA
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

// Get only Staff members
router.get('/staff-list', async (req, res) => {
    try {
        const staff = await User.find({ role: 'staff' }).select('-password');
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a Staff member
router.delete('/staff/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Staff member removed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});