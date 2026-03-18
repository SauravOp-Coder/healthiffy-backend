require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const Order = require('./models/order'); 

const app = express();

const server = http.createServer(app); 

// --- FIXED: Updated Origins ---
const allowedOrigins = [
  "https://healthiffy-frontend.vercel.app", // Use your REAL Vercel URL here
  "http://localhost:3000"
];

// Keep only ONE CORS declaration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json()); // Body parser must come after CORS

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

// --- FIXED: Global Error Handler ---
// This will log the EXACT error to your Render console instead of just sending "500"
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

  socket.on('confirm-payment', (data) => {
    const { orderId, remainingCredits } = data;
    io.emit(`payment-verified-${orderId}`, { 
      status: 'success', 
      remainingCredits: remainingCredits 
    });
  });

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