const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');

// 1. PLACE ORDER (Now primarily for Credits)
// Cash orders are now created via Socket in server.js to ensure they only save after verification.
router.post('/place-order', async (req, res) => {
    const { userId, cart, paymentMethod } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let totalCreditsNeeded = 0;
        let totalCashNeeded = 0;

        // Calculate totals and verify product existence
        for (let item of cart) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            totalCreditsNeeded += (product.creditCost * item.quantity);
            totalCashNeeded += (product.price * item.quantity);
        }

        // Logic for Credit Payment (Auto-verified)
        if (paymentMethod === 'credits') {
            if (user.creditBalance < totalCreditsNeeded) {
                return res.status(400).json({ message: "Insufficient credits!" });
            }
            
            // Deduct credits immediately
            user.creditBalance -= totalCreditsNeeded;
            await user.save();

            const newOrder = new Order({
                customer: userId,
                items: cart.map(item => ({ product: item.productId, quantity: item.quantity })),
                totalAmount: totalCashNeeded,
                totalCredits: totalCreditsNeeded,
                paymentMethod: 'credits',
                status: 'Paid' // Credits are instant, so status is Paid
            });

            await newOrder.save();
            return res.status(201).json({ 
                message: "Order placed via Credits!", 
                order: newOrder, 
                remainingCredits: user.creditBalance 
            });
        }

        // If a cash order accidentally hits this route, we handle it as 'pending'
        // But remember: your new CustomerMenu uses Sockets for Cash now!
        if (paymentMethod === 'cash') {
            return res.status(400).json({ 
                message: "Cash orders must be verified by staff via Socket before saving to history." 
            });
        }

    } catch (err) {
        console.error("Order Route Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. GET ALL ORDERS (Staff Feed)
// Shows everything currently in the DB
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items.product')
            .populate('customer', 'name creditBalance')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// 3. GET USER ORDER HISTORY
// This will ONLY show orders that have been successfully saved (Verified Cash or Credits)
router.get('/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.params.userId })
            .populate({
                path: 'items.product',
                select: 'name image price creditCost'
            })
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch history" });
    }
});

// 4. UPDATE ORDER STATUS
// Used by staff to change status from 'Paid' to 'Preparing', 'Completed', etc.
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, 
            { status: status }, 
            { new: true }
        );
        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ error: "Failed to update status" });
    }
});

module.exports = router;