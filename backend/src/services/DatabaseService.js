/**
 * DatabaseService - Handles all MongoDB operations
 * Persistence for games, players, and leaderboard
 */

const { Game, Player, Leaderboard, AnalyticsEvent } = require('../models/schemas');

class DatabaseService {
  /**
   * Initialize database connection
   */
  static async connect(mongoUri) {
    const mongoose = require('mongoose');
    try {
      await mongoose.connect(mongoUri);
      console.log('✓ MongoDB connected');
    } catch (error) {
      console.error('✗ MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Save completed game to database
   */
  static async saveGame(session) {
    try {
      const game = new Game({
        sessionId: session.sessionId,
        player1: {
          username: session.player1.username,
          isBot: false
        },
        player2: {
          username: session.player2.username,
          isBot: session.player2.isBot || false
        },
        winner: session.winner,
        result: session.result,
        duration: session.endTime - session.startTime,
        moveCount: session.gameEngine.moveHistory.length,
        board: session.gameEngine.getBoard(),
        startedAt: new Date(session.startTime),
        endedAt: new Date(session.endTime)
      });

      await game.save();

      // Update player stats
      await this.updatePlayerStats(
        session.player1.username,
        session.player2.username,
        session.result,
        session.winner,
        session.endTime - session.startTime
      );

      // Update leaderboard
      await this.updateLeaderboard();

      return game;
    } catch (error) {
      console.error('Error saving game:', error);
      throw error;
    }
  }

  /**
   * Update player statistics after game
   */
  static async updatePlayerStats(player1, player2, result, winner, duration) {
    try {
      // Ensure both players exist
      await Player.updateOne(
        { username: player1 },
        {
          $setOnInsert: { username: player1 },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );

      await Player.updateOne(
        { username: player2 },
        {
          $setOnInsert: { username: player2 },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );

      // Update based on result
      if (result === 'win') {
        await Player.updateOne(
          { username: winner },
          {
            $inc: {
              wins: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );

        const loser = winner === player1 ? player2 : player1;
        await Player.updateOne(
          { username: loser },
          {
            $inc: {
              losses: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );
      } else if (result === 'draw') {
        await Player.updateOne(
          { username: player1 },
          {
            $inc: {
              draws: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );

        await Player.updateOne(
          { username: player2 },
          {
            $inc: {
              draws: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );
      } else if (result === 'forfeit') {
        // Winner
        await Player.updateOne(
          { username: winner },
          {
            $inc: {
              wins: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );

        // Loser (forfeited)
        const loser = winner === player1 ? player2 : player1;
        await Player.updateOne(
          { username: loser },
          {
            $inc: {
              forfeits: 1,
              losses: 1,
              totalGames: 1,
              totalDuration: duration
            },
            $set: { lastGameAt: new Date(), updatedAt: new Date() }
          }
        );
      }

      // Recalculate win rate and average duration
      await this.recalculatePlayerStats(player1);
      await this.recalculatePlayerStats(player2);
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }

  /**
   * Recalculate player's win rate and average game duration
   */
  static async recalculatePlayerStats(username) {
    try {
      const player = await Player.findOne({ username });
      if (!player) return;

      const totalGames = player.wins + player.losses + player.draws + player.forfeits;
      const winRate = totalGames > 0 ? (player.wins / totalGames) * 100 : 0;
      const avgDuration = totalGames > 0 ? player.totalDuration / totalGames : 0;

      await Player.updateOne(
        { username },
        {
          $set: {
            totalGames,
            winRate: Math.round(winRate * 100) / 100,
            averageGameDuration: Math.round(avgDuration)
          }
        }
      );
    } catch (error) {
      console.error('Error recalculating stats:', error);
    }
  }

  /**
   * Update leaderboard (top 100 players by wins)
   */
  static async updateLeaderboard() {
    try {
      const topPlayers = await Player.find()
        .sort({ wins: -1 })
        .limit(100);

      await Leaderboard.deleteMany({}); // Clear existing leaderboard

      for (let i = 0; i < topPlayers.length; i++) {
        await Leaderboard.create({
          username: topPlayers[i].username,
          rank: i + 1,
          wins: topPlayers[i].wins,
          losses: topPlayers[i].losses,
          draws: topPlayers[i].draws,
          totalGames: topPlayers[i].totalGames,
          winRate: topPlayers[i].winRate
        });
      }
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit = 20) {
    try {
      return await Leaderboard.find()
        .sort({ rank: 1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get player stats
   */
  static async getPlayerStats(username) {
    try {
      return await Player.findOne({ username });
    } catch (error) {
      console.error('Error fetching player stats:', error);
      return null;
    }
  }

  /**
   * Save analytics event
   */
  static async saveAnalyticsEvent(eventData) {
    try {
      const event = new AnalyticsEvent(eventData);
      await event.save();
      return event;
    } catch (error) {
      console.error('Error saving analytics event:', error);
    }
  }

  /**
   * Get game statistics for analytics
   * Used by Kafka consumer
   */
  static async getGameStatistics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await Game.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $facet: {
            totalGames: [{ $count: 'count' }],
            avgDuration: [
              { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
            ],
            winnerFrequency: [
              {
                $group: {
                  _id: '$winner',
                  gameCount: { $sum: 1 }
                }
              },
              { $sort: { gameCount: -1 } },
              { $limit: 10 }
            ],
            resultCounts: [
              {
                $group: {
                  _id: '$result',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]);

      return stats[0];
    } catch (error) {
      console.error('Error getting game statistics:', error);
      return null;
    }
  }

  /**
   * Get games per hour (for analytics)
   */
  static async getGamesPerHour(hours = 24) {
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await Game.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
              hour: { $hour: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
      ]);
    } catch (error) {
      console.error('Error getting games per hour:', error);
      return [];
    }
  }
}

module.exports = DatabaseService;
