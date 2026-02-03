const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// 1. GET Products (Supports optional Search and Category filtering)
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};

        // Search logic
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Category filter logic
        if (category && category !== 'All') {
            query.category = category;
        }

        const products = await Product.find(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. POST a new product
router.post('/', async (req, res) => {
    try {
        const { name, price, creditCost, category, image, description } = req.body;
        const newProduct = new Product({
            name,
            price,
            creditCost,
            category: category || "General",
            description,
            image: image || "https://via.placeholder.com/150"
        });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ error: "Failed to add product: " + err.message });
    }
});

// 3. DELETE a product
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;