/**
 * KafkaProducer - Sends game events to Kafka
 * Events: game started, move played, game ended, player disconnected
 */

const { Kafka } = require('kafkajs');

class KafkaProducer {
  constructor(brokers = ['localhost:9092']) {
    this.kafka = new Kafka({
      clientId: 'connect4-producer',
      brokers
    });
    this.producer = this.kafka.producer();
    this.connected = false;
  }

  async connect() {
    try {
      await this.producer.connect();
      this.connected = true;
      console.log('Kafka Producer connected');
    } catch (error) {
      console.error('Kafka Producer connection failed:', error);
      this.connected = false;
    }
  }

  /**
   * Send game started event
   */
  async sendGameStarted(session) {
    if (!this.connected) return;

    const event = {
      eventType: 'GAME_STARTED',
      sessionId: session.sessionId,
      player1: session.player1.username,
      player2: session.player2.username,
      isVsBot: session.isVsBot,
      timestamp: new Date().toISOString()
    };

    await this.sendEvent(event);
  }

  /**
   * Send move played event
   */
  async sendMovePlayed(session, col, row, player) {
    if (!this.connected) return;

    const event = {
      eventType: 'MOVE_PLAYED',
      sessionId: session.sessionId,
      player1: session.player1.username,
      player2: session.player2.username,
      isVsBot: session.isVsBot,
      moveColumn: col,
      moveRow: row,
      moveMadeBy: player.username,
      timestamp: new Date().toISOString()
    };

    await this.sendEvent(event);
  }

  /**
   * Send game ended event
   */
  async sendGameEnded(session) {
    if (!this.connected) return;

    const event = {
      eventType: 'GAME_ENDED',
      sessionId: session.sessionId,
      player1: session.player1.username,
      player2: session.player2.username,
      isVsBot: session.isVsBot,
      gameResult: session.result,
      winner: session.winner || null,
      gameDuration: session.endTime - session.startTime,
      moveCount: session.gameEngine.moveHistory.length,
      timestamp: new Date().toISOString()
    };

    await this.sendEvent(event);
  }

  /**
   * Send player disconnected event
   */
  async sendPlayerDisconnected(session, playerUsername) {
    if (!this.connected) return;

    const event = {
      eventType: 'PLAYER_DISCONNECTED',
      sessionId: session.sessionId,
      player1: session.player1.username,
      player2: session.player2.username,
      isVsBot: session.isVsBot,
      disconnectedPlayer: playerUsername,
      timestamp: new Date().toISOString()
    };

    await this.sendEvent(event);
  }

  /**
   * Send event to Kafka topic
   */
  async sendEvent(event) {
    try {
      await this.producer.send({
        topic: 'connect4-events',
        messages: [
          {
            key: event.sessionId,
            value: JSON.stringify(event),
            headers: {
              'eventType': event.eventType
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error sending Kafka event:', error);
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
      console.log('Kafka Producer disconnected');
    }
  }
}

module.exports = KafkaProducer;
