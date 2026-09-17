const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./config/db');
const { initChatSocket } = require('./sockets/chatSocket');
const { seedData } = require('./utils/seed');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

const path = require('path');

// Middleware
app.set('trust proxy', true);
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Dedicated login and registration portal route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Root route: redirect visitors to Login Portal
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.use(express.static(path.join(__dirname, '../public')));

// Request logging (development)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'SkillMint Backend Core API',
    database: db.getDBType()
  });
});

const adminRoutes = require('./routes/adminRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// 404 and Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.io Chat Handlers
initChatSocket(io);

// Helper to retrieve local network IP for phone/mobile access
function getLocalNetworkIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // Initialize Database
    await db.initDB();

    // Auto-seed initial demo data if database is fresh
    await seedData();

    server.listen(PORT, HOST, () => {
      const localIP = getLocalNetworkIP();
      console.log(`=======================================================`);
      console.log(`🚀 SkillMint Full-Stack Server is running for Laptop & Phone!`);
      console.log(`💻 Laptop (Localhost):     http://localhost:${PORT}`);
      console.log(`📱 Phone (Same Wi-Fi/LAN): http://${localIP}:${PORT}`);
      console.log(`📡 REST API Base:          http://${localIP}:${PORT}/api`);
      console.log(`⚡ Socket.io Real-Time:    ws://${localIP}:${PORT}`);
      console.log(`💾 Database Engine:        ${db.getDBType().toUpperCase()}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  startServer();
}

// Export Express app directly for Vercel Serverless Function compatibility
module.exports = app;
app.app = app;
app.server = server;
app.io = io;
app.startServer = startServer;
