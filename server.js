require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Order = require('./models/order'); 
const User = require('./models/user'); // Added to update user credits if needed

const app = express();
const server = http.createServer(app); 

// --- FIXED: Updated Origins ---
const allowedOrigins = [
  "https://healthiffy-frontend.vercel.app", 
  "http://localhost:3000"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// --- API Routes ---
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));

app.get('/', (req, res) => {
  res.send("Cafe API is live and connected to DB!");
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.stack);
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: err.message 
  });
});

// --- Socket.io Logic ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`📡 New connection: ${socket.id}`);

  // 1. USER CLAIMS THEY PAID (Cash/UPI)
  socket.on('claim-payment', (data) => {
    console.log(`💰 Payment claim received from ${data.userName}`);
    // Forward this request to the Staff Dashboard
    io.emit('new-payment-request', {
      userId: data.userId,
      userName: data.userName,
      cart: data.cart,
      total: data.total,
      timestamp: new Date()
    });
  });

  // 2. STAFF APPROVES THE CLAIM -> ORDER FINALLY CREATED
  socket.on('staff-approve-order', async (data) => {
    try {
      const { userId, cart, total } = data;

      // Create the order in MongoDB only NOW
      const newOrder = new Order({
        userId: userId,
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity
        })),
        totalAmount: total,
        paymentMethod: 'cash',
        status: 'Paid' // Marking as paid since staff verified it
      });

      const savedOrder = await newOrder.save();
      console.log(`✅ Order ${savedOrder._id} created after staff verification`);

      // Notify the specific User that they can proceed to success page
      io.emit(`payment-verified-${userId}`, { 
        status: 'success', 
        orderId: savedOrder._id 
      });

    } catch (err) {
      console.error("❌ Error creating order after verification:", err);
    }
  });

  // Legacy location tracking logic
  socket.on('update-location', async (data) => {
    const { orderId, lat, lng } = data;
    try {
      await Order.findByIdAndUpdate(orderId, {
        location: { lat, lng, updatedAt: new Date() }
      });
      io.emit('location-received', data);
    } catch (err) {
      console.error("❌ Error updating location:", err);
    }
  });

  socket.on('disconnect', () => console.log('❌ User disconnected'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});