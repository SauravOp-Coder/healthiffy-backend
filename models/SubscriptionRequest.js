const mongoose = require('mongoose');

const subRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },
  creditsToGrant: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  receiptImage: { type: String, required: true }, // This will store the Base64 string or Image URL
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubscriptionRequest', subRequestSchema);