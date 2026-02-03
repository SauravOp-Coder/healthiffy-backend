
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    credits: { type: Number, required: true },
    description: { type: String, default: "Cafe Credit Plan" }
});

module.exports = mongoose.model('Plan', planSchema);