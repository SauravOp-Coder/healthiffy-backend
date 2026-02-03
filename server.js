require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const Order = require('./models/Order'); 

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    origin: "*", // For testing, you can use "*" then change to your Vercel URL later
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
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));

app.get('/', (req, res) => {
  res.send("Cafe API is live and connected to DB!");
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log(`📡 New connection: ${socket.id}`);

  // 1. Handle Payment Verification (The Handshake)
  socket.on('confirm-payment', (data) => {
    const { orderId, remainingCredits } = data;
    console.log(`💰 Payment Verified for Order: ${orderId}`);
    
    // Alert only the specific customer that their payment is approved
    io.emit(`payment-verified-${orderId}`, { 
      status: 'success', 
      remainingCredits: remainingCredits 
    });
  });

  // 2. Handle Real-Time Location Persistence
  socket.on('update-location', async (data) => {
    const { orderId, lat, lng } = data;
    
    try {
      await Order.findByIdAndUpdate(orderId, {
        location: {
          lat: lat,
          lng: lng,
          updatedAt: new Date()
        }
      });

      // Broadcast to Staff Dashboard
      io.emit('location-received', data);
      
    } catch (err) {
      console.error("❌ Error updating location in DB:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

