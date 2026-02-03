const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number
  }],
  totalAmount: Number,
  totalCredits: Number,
  paymentMethod: { type: String, enum: ['cash', 'credits'] },
  status: { 
    type: String, 
    enum: ['pending', 'preparing', 'ready', 'out-for-delivery', 'delivered'],
    default: 'pending' 
  },
  // --- NEW LOCATION FIELD ---
  location: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);