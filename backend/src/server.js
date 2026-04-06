require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter, sanitizeInput } = require('./middleware/security');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a match room for live updates
  socket.on('join:match', (matchId) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} joined match:${matchId}`);
  });

  socket.on('leave:match', (matchId) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('join:tournament', (tournamentId) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Attach io to app for use in controllers
app.set('io', io);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(apiLimiter);

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Cricket Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🏏 Cricket Platform API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = { app, server, io };
