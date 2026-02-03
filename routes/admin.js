// routes/admin.js
const express = require('express');
const router = express.Router();
const Product = require('./models/product');

// 1. ADD A NEW PRODUCT
router.post('/add-product', async (req, res) => {
  const { name, category, price, creditCost, description, image } = req.body;
  
  try {
    const newProduct = new Product({
      name,
      category,
      price,
      creditCost, // e.g., if price is 30, admin sets this to 3
      description,
      image,
      isAvailable: true
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added to menu!", product: newProduct });
  } catch (error) {
    res.status(500).json({ message: "Error adding product", error });
  }
});

// 2. TOGGLE AVAILABILITY (The "Milk is out" switch)
router.patch('/toggle-stock/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    product.isAvailable = !product.isAvailable; // Flips true to false or vice versa
    await product.save();
    res.json({ message: "Stock status updated", isAvailable: product.isAvailable });
  } catch (error) {
    res.status(500).json({ message: "Error updating status" });
  }
});



module.exports = router;