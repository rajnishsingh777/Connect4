/**
 * KafkaConsumer - Consumes game events from Kafka
 * Processes and stores: game data, statistics, analytics
 */

const { Kafka } = require('kafkajs');
const DatabaseService = require('../services/DatabaseService');

class KafkaConsumer {
  constructor(brokers = ['localhost:9092']) {
    this.kafka = new Kafka({
      clientId: 'connect4-consumer',
      brokers
    });
    this.consumer = this.kafka.consumer({ groupId: 'connect4-analytics' });
    this.connected = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: 'connect4-events' });
      this.connected = true;
      console.log('Kafka Consumer connected');
    } catch (error) {
      console.error('Kafka Consumer connection failed:', error);
      this.connected = false;
      return;
    }

    // Start consuming messages
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await this.handleMessage(message);
      }
    });
  }

  /**
   * Handle incoming Kafka message
   */
  async handleMessage(message) {
    try {
      const event = JSON.parse(message.value.toString());
      
      // Store event in MongoDB
      await DatabaseService.saveAnalyticsEvent(event);

      // Process event for analytics
      switch (event.eventType) {
        case 'GAME_STARTED':
          console.log(`[KAFKA] Game started: ${event.sessionId}`);
          break;

        case 'MOVE_PLAYED':
          // Could track move patterns here if needed
          break;

        case 'GAME_ENDED':
          await this.processGameEnded(event);
          break;

        case 'PLAYER_DISCONNECTED':
          console.log(`[KAFKA] Player disconnected: ${event.disconnectedPlayer}`);
          break;
      }
    } catch (error) {
      console.error('Error processing Kafka message:', error);
    }
  }

  /**
   * Process game ended event for analytics
   */
  async processGameEnded(event) {
    console.log(`[KAFKA] Game ended: ${event.sessionId}, Result: ${event.gameResult}`);
    
    // Analytics are automatically updated via DatabaseService.saveGame()
    // which updates player stats and leaderboard
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary() {
    try {
      // Get overall statistics
      const stats = await DatabaseService.getGameStatistics(7); // Last 7 days
      const gamesPerHour = await DatabaseService.getGamesPerHour(24); // Last 24 hours

      return {
        timeframe: 'Last 7 days',
        totalGames: stats.totalGames?.[0]?.count || 0,
        averageGameDuration: stats.avgDuration?.[0]?.avgDuration || 0,
        mostFrequentWinners: stats.winnerFrequency || [],
        gameResults: stats.resultCounts || [],
        gamesPerHour: gamesPerHour || []
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return null;
    }
  }

  /**
   * Disconnect consumer
   */
  async disconnect() {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
      console.log('Kafka Consumer disconnected');
    }
  }
}

module.exports = KafkaConsumer;
