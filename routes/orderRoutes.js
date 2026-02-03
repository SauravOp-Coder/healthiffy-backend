const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');

// 1. PLACE ORDER
router.post('/place-order', async (req, res) => {
    const { userId, cart, paymentMethod } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let totalCreditsNeeded = 0;
        let totalCashNeeded = 0;

        for (let item of cart) {
            const product = await Product.findById(item.productId);
            totalCreditsNeeded += (product.creditCost * item.quantity);
            totalCashNeeded += (product.price * item.quantity);
        }

        if (paymentMethod === 'credits') {
            if (user.creditBalance < totalCreditsNeeded) {
                return res.status(400).json({ message: "Insufficient credits!" });
            }
            user.creditBalance -= totalCreditsNeeded;
            await user.save();
        }

        const newOrder = new Order({
            customer: userId,
            items: cart.map(item => ({ product: item.productId, quantity: item.quantity })),
            totalAmount: totalCashNeeded,
            totalCredits: totalCreditsNeeded,
            paymentMethod: paymentMethod,
            status: 'pending' // Defaults to pending
        });

        await newOrder.save();
        res.status(201).json({ 
            message: "Order placed!", 
            order: newOrder, 
            remainingCredits: user.creditBalance 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. GET ALL ORDERS (Staff Feed)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items.product')
            .populate('customer', 'name creditBalance') // Added customer details for staff
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// 3. GET ORDER BY ID (For polling verification)
router.get('/:id/status', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.json({ status: order.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. GET USER ORDER HISTORY
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

// 5. UPDATE ORDER STATUS (The "Unlock" Trigger)
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