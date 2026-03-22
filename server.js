require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Models
const Order = require('./models/order'); 
const User = require('./models/user'); 

const app = express();
const server = http.createServer(app); 

// --- Origins ---
const allowedOrigins = [
  "https://healthiffy-frontend.vercel.app", 
  "http://localhost:3000",
  'https://www.healthiffy.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// --- Socket.io Instance (Define this BEFORE routes) ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// --- API Routes ---
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));

// Pass the 'io' instance to orderRoutes so it can emit events
const orderRoutes = require('./routes/orderRoutes')(io); 
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.send("Cafe API is live and connected to DB!");
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log(`📡 New connection: ${socket.id}`);

  // 1. USER CLAIMS THEY PAID (Cash/UPI)
  socket.on('claim-payment', (data) => {
    console.log(`💰 Payment claim received from ${data.userName}`);
    io.emit('new-payment-request', {
      userId: data.userId,
      userName: data.userName,
      cart: data.cart,
      total: data.total,
      timestamp: new Date()
    });
  });

  // 2. STAFF APPROVES -> ORDER STATUS UPDATE
  // Note: Your orderRoutes handles the PATCH request, 
  // but if you want to handle extra logic here, you can.
  socket.on('disconnect', () => console.log('❌ User disconnected'));
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.stack);
  res.status(500).json({ 
    message: "Internal Server Error", 
    error: err.message 
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});