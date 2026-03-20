const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const User = require('../models/user');
const Product = require('../models/product');

// NOTE: We wrap the router in a function so we can pass the 'io' instance from server.js
module.exports = function(io) {

    // 1. PLACE ORDER
    router.post('/place-order', async (req, res) => {
        const { userId, cart, paymentMethod } = req.body;

        try {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            let totalCreditsNeeded = 0;
            let totalCashNeeded = 0;
            const itemsWithDetails = [];

            for (let item of cart) {
                const product = await Product.findById(item.productId);
                totalCreditsNeeded += (product.creditCost * item.quantity);
                totalCashNeeded += (product.price * item.quantity);
                itemsWithDetails.push({ product: product._id, quantity: item.quantity });
            }

            // Deduct credits immediately if using credit method
            if (paymentMethod === 'credits') {
                if (user.creditBalance < totalCreditsNeeded) {
                    return res.status(400).json({ message: "Insufficient credits!" });
                }
                user.creditBalance -= totalCreditsNeeded;
                await user.save();
            }

            const newOrder = new Order({
                customer: userId,
                items: itemsWithDetails,
                totalAmount: totalCashNeeded,
                totalCredits: totalCreditsNeeded,
                paymentMethod: paymentMethod,
                status: 'pending' 
            });

            await newOrder.save();

            // --- SOCKET TRIGGER: Notify Staff ---
            // This sends the new order to the staff dashboard in real-time
            const populatedOrder = await Order.findById(newOrder._id)
                .populate('items.product')
                .populate('customer', 'name');
            
            io.emit('new-order-received', populatedOrder);

            res.status(201).json({ 
                message: "Order placed!", 
                order: newOrder, 
                remainingCredits: user.creditBalance 
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // 2. GET ALL ORDERS (Staff Feed)
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

    // 3. UPDATE ORDER STATUS (The "Unlock" Trigger)
    router.patch('/:id/status', async (req, res) => {
        try {
            const { status } = req.body;
            const updatedOrder = await Order.findByIdAndUpdate(
                req.params.id, 
                { status: status }, 
                { new: true }
            );

            // --- SOCKET TRIGGER: Notify Customer ---
            // If staff marks as 'paid' or 'completed', tell the customer's phone to redirect
            if (status === 'paid' || status === 'completed' || status === 'approved') {
                const user = await User.findById(updatedOrder.customer);
                io.emit(`payment-verified-${updatedOrder._id}`, {
                    status: updatedOrder.status,
                    remainingCredits: user ? user.creditBalance : 0
                });
            }

            res.json(updatedOrder);
        } catch (err) {
            res.status(500).json({ error: "Failed to update status" });
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

    return router;
};