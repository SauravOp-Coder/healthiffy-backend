const express = require('express');
const router = express.Router();
const SubscriptionRequest = require('../models/SubscriptionRequest');
const User = require('../models/User');

// CUSTOMER: Submit a receipt for a plan
router.post('/request', async (req, res) => {
    try {
        const { userId, planName, creditsToGrant, amountPaid, receiptImage } = req.body;
        
        const newRequest = new SubscriptionRequest({
            user: userId,
            planName,
            creditsToGrant,
            amountPaid,
            receiptImage
        });

        await newRequest.save();
        res.status(201).json({ message: "Receipt uploaded! Waiting for admin approval." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN: Get all pending receipts
router.get('/admin/pending', async (req, res) => {
    try {
        const requests = await SubscriptionRequest.find({ status: 'pending' }).populate('user', 'name phone');
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN: Approve a receipt and GRANT CREDITS
router.patch('/admin/approve/:requestId', async (req, res) => {
    try {
        const request = await SubscriptionRequest.findById(req.params.requestId);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: "Request not found or already processed" });
        }

        // 1. Find the user
        const user = await User.findById(request.user);
        
        // 2. Add the credits to user's balance
        user.creditBalance += request.creditsToGrant;
        
        // 3. Mark request as approved
        request.status = 'approved';

        await user.save();
        await request.save();

        res.json({ message: "Plan approved! Credits added to user account.", newBalance: user.creditBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;