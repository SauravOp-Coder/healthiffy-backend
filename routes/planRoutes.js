const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

// POST route to add a plan
router.post('/', async (req, res) => {
    try {
        const { name, price, credits } = req.body;
        const newPlan = new Plan({ name, price, credits });
        await newPlan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(400).json({ message: "Error saving plan", error: err.message });
    }
});

// GET route to fetch plans
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.find();
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// backend/routes/planRoutes.js
router.delete('/:id', async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; // <--- DON'T FORGET THIS