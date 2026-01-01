/**
 * MongoDB Schemas for Connect Four
 */

const mongoose = require('mongoose');

// Game Schema - stores completed games
const gameSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  player1: {
    username: String,
    isBot: { type: Boolean, default: false }
  },
  player2: {
    username: String,
    isBot: { type: Boolean, default: false }
  },
  winner: String, // Username of winner, null for draw/forfeit
  result: {
    type: String,
    enum: ['win', 'draw', 'forfeit'],
    required: true
  },
  duration: Number, // Game duration in milliseconds
  moveCount: Number, // Total moves played
  board: [[Number]], // Final board state
  startedAt: Date,
  endedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Player Schema - player statistics
const playerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  },
  forfeits: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0 // percentage
  },
  totalDuration: {
    type: Number,
    default: 0 // total time spent playing in ms
  },
  averageGameDuration: {
    type: Number,
    default: 0 // average game duration in ms
  },
  lastGameAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Leaderboard Schema - cached for fast queries
const leaderboardSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  rank: Number,
  wins: Number,
  losses: Number,
  draws: Number,
  totalGames: Number,
  winRate: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Analytics Event Schema - for Kafka events
const analyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['GAME_STARTED', 'MOVE_PLAYED', 'GAME_ENDED', 'PLAYER_DISCONNECTED'],
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  player1: String,
  player2: String,
  isVsBot: Boolean,
  moveColumn: Number,
  moveRow: Number,
  moveMadeBy: String,
  gameResult: String,
  gameDuration: Number,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const Game = mongoose.model('Game', gameSchema);
const Player = mongoose.model('Player', playerSchema);
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

module.exports = {
  Game,
  Player,
  Leaderboard,
  AnalyticsEvent
};
