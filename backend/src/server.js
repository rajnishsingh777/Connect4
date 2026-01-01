/**
 * Connect Four - Real-time Multiplayer Game Server
 * Tech Stack: Node.js, Express, Socket.IO, MongoDB, Kafka
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const GameEngine = require('./engines/GameEngine');
const MatchmakingService = require('./services/MatchmakingService');
const DatabaseService = require('./services/DatabaseService');
const KafkaProducer = require('./kafka/KafkaProducer');
const KafkaConsumer = require('./kafka/KafkaConsumer');
const gameHandlers = require('./sockets/gameHandlers');

// Configuration
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/connect4';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const matchmaker = new MatchmakingService();
const kafkaProducer = new KafkaProducer(KAFKA_BROKERS);
const kafkaConsumer = new KafkaConsumer(KAFKA_BROKERS);

// Set io instance on matchmaker for bot spawn notifications
matchmaker.io = io;

// Initialize game handlers
let handlers;

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    waitingPlayers: matchmaker.getWaitingPlayerCount(),
    activeSessions: matchmaker.activeSessions.size
  });
});

/**
 * Get leaderboard endpoint
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const leaderboard = await DatabaseService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * Get player stats endpoint
 */
app.get('/api/player/:username', async (req, res) => {
  try {
    const stats = await DatabaseService.getPlayerStats(req.params.username);
    if (stats) {
      res.json(stats);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

/**
 * Get analytics endpoint (Kafka data)
 */
app.get('/api/analytics', async (req, res) => {
  try {
    const summary = await kafkaConsumer.getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * Socket.IO connection handling
 */
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  // Join queue for matchmaking
  socket.on('joinQueue', (data) => {
    console.log(`[SERVER] joinQueue event received`);
    handlers.onJoinQueue(socket, data);
  });

  // Make move
  socket.on('makeMove', (data) => {
    console.log(`[SERVER] makeMove event received:`, data);
    handlers.onMakeMove(socket, data);
  });

  // Reconnection attempt
  socket.on('reconnect', (data) => {
    handlers.onReconnect(socket, data);
  });

  // Get leaderboard
  socket.on('getLeaderboard', () => {
    handlers.onGetLeaderboard(socket);
  });

  // Get player stats
  socket.on('getPlayerStats', (data) => {
    handlers.onGetPlayerStats(socket, data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    handlers.onDisconnect(socket);
  });
});

async function startServer() {
  try {
    console.log('\nStarting Connect Four Game Server...\n');

    // Connect to MongoDB
    await DatabaseService.connect(MONGODB_URI);

    kafkaProducer.connect().catch(err => {
      console.warn('Warning: Kafka Producer failed to connect:', err.message);
    });

    kafkaConsumer.connect().catch(err => {
      console.warn('Warning: Kafka Consumer failed to connect:', err.message);
    });

    // Initialize handlers
    handlers = gameHandlers(io, matchmaker, kafkaProducer, DatabaseService);

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`WebSocket ready at ws://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log('   GET  /health - Server health check');
      console.log('   GET  /api/leaderboard - Get top players');
      console.log('   GET  /api/player/:username - Get player stats');
      console.log('   GET  /api/analytics - Get Kafka analytics');
      console.log('\nSocket.IO events:');
      console.log('   joinQueue - Join matchmaking queue');
      console.log('   makeMove - Play a move');
      console.log('   reconnect - Reconnect to game');
      console.log('   getLeaderboard - Fetch leaderboard');
      console.log('   getPlayerStats - Fetch player stats\n');
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  
  // Cleanup timers
  for (const [, timeoutId] of matchmaker.matchmakingTimeouts) {
    clearTimeout(timeoutId);
  }

  // Disconnect services
  await kafkaProducer.disconnect();
  await kafkaConsumer.disconnect();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io, matchmaker, kafkaProducer, kafkaConsumer };
