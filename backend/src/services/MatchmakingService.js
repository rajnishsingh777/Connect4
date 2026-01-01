/**
 * MatchmakingService - Handles player queue and session management
 * Implements: player pairing, bot fallback after 10 seconds
 */

const GameEngine = require('../engines/GameEngine');
const BotEngine = require('../engines/BotEngine');

class MatchmakingService {
  constructor(io = null) {
    this.io = io;
    
    this.waitingPlayers = new Map();
    this.activeSessions = new Map();
    this.matchmakingTimeouts = new Map();
  }

  /**
   * Join queue for matchmaking
   * Returns: { sessionId, paired: boolean, opponent?: string, isVsBot?: boolean }
   */
  joinQueue(socketId, username, socket, gameMode = 'bot') {
    if (this.waitingPlayers.has(socketId)) {
      return { sessionId: null, error: 'Already in queue' };
    }

    for (const session of this.activeSessions.values()) {
      if (session.player1.username === username || session.player2.username === username) {
        return { sessionId: null, error: 'Username already in game' };
      }
    }

    this.waitingPlayers.set(socketId, {
      socketId,
      username,
      socket,
      gameMode,
      timestamp: Date.now()
    });

    if (gameMode === 'bot') {
      console.log(`[MATCHMAKER] Bot mode selected - spawning bot immediately for ${username}`);
      const session = this.spawnBotOpponent(socketId);
      return { sessionId: session.sessionId, paired: false, isVsBot: true };
    }

    const paired = this.tryPairPlayers(socketId);
    
    if (paired) {
      return { sessionId: paired.sessionId, paired: true, opponent: paired.opponent };
    }

    console.log(`[MATCHMAKER] Human mode - waiting for opponent (10 second timeout for bot fallback)`);
    const timeoutId = setTimeout(() => {
      this.spawnBotOpponent(socketId);
    }, 10000);

    this.matchmakingTimeouts.set(socketId, timeoutId);

    return { sessionId: null, paired: false, isVsBot: false };
  }

  /**
   * Try to pair two waiting players
   * Returns: { sessionId, opponent } or null
   */
  tryPairPlayers(socketId) {
    const currentPlayer = this.waitingPlayers.get(socketId);
    
    for (const [otherId, otherPlayer] of this.waitingPlayers.entries()) {
      if (otherId !== socketId) {
        this.waitingPlayers.delete(socketId);
        this.waitingPlayers.delete(otherId);

        if (this.matchmakingTimeouts.has(otherId)) {
          clearTimeout(this.matchmakingTimeouts.get(otherId));
          this.matchmakingTimeouts.delete(otherId);
        }
        if (this.matchmakingTimeouts.has(socketId)) {
          clearTimeout(this.matchmakingTimeouts.get(socketId));
          this.matchmakingTimeouts.delete(socketId);
        }

        const session = this.createSession(
          socketId,
          currentPlayer.username,
          otherId,
          otherPlayer.username,
          false
        );

        if (currentPlayer.socket) {
          try {
            currentPlayer.socket.join(session.sessionId);
            console.log(`[MATCHMAKER] Player 1 socket joined to room: ${session.sessionId}`);
          } catch (err) {
            console.log(`[MATCHMAKER] Error joining Player 1 socket: ${err.message}`);
          }
        }

        if (otherPlayer.socket) {
          try {
            otherPlayer.socket.join(session.sessionId);
            console.log(`[MATCHMAKER] Player 2 socket joined to room: ${session.sessionId}`);
          } catch (err) {
            console.log(`[MATCHMAKER] Error joining Player 2 socket: ${err.message}`);
          }
        }

        return { sessionId: session.sessionId, opponent: otherPlayer.username };
      }
    }

    return null;
  }

  /**
   * Spawn bot opponent after timeout or immediately
   */
  spawnBotOpponent(playerSocketId) {
    console.log(`[MATCHMAKER] Spawning bot opponent for: ${playerSocketId}`);
    
    const player = this.waitingPlayers.get(playerSocketId);
    
    if (!player) {
      console.log(`[MATCHMAKER] Player not in queue: ${playerSocketId}`);
      return null;
    }

    this.waitingPlayers.delete(playerSocketId);
    if (this.matchmakingTimeouts.has(playerSocketId)) {
      this.matchmakingTimeouts.delete(playerSocketId);
    }

    const session = this.createSession(
      playerSocketId,
      player.username,
      'BOT',
      'ConnectBot',
      true
    );

    console.log(`[MATCHMAKER] Session created: ${session.sessionId}`);

    if (player.socket) {
      try {
        player.socket.join(session.sessionId);
        console.log(`[MATCHMAKER] Socket joined to room: ${session.sessionId}`);
      } catch (err) {
        console.log(`[MATCHMAKER] Error joining socket to room: ${err.message}`);
      }
    } else {
      console.log(`[MATCHMAKER] Socket not available in player object`);
    }

    return session;
  }

  /**
   * Create a new game session
   */
  createSession(player1SocketId, player1Username, player2SocketId, player2Username, isVsBot) {
    const sessionId = this.generateSessionId();
    const gameEngine = new GameEngine();
    
    const session = {
      sessionId,
      player1: {
        socketId: player1SocketId,
        username: player1Username,
        connected: true,
        disconnectTime: null
      },
      player2: isVsBot ? {
        socketId: null,
        username: player2Username,
        isBot: true,
        connected: true,
        disconnectTime: null
      } : {
        socketId: player2SocketId,
        username: player2Username,
        connected: true,
        disconnectTime: null
      },
      isVsBot,
      gameEngine: gameEngine,
      botEngine: isVsBot ? new BotEngine(gameEngine) : null,
      startTime: Date.now(),
      endTime: null,
      result: null, // 'win', 'draw'
      winner: null,
      createdAt: new Date()
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get session by player socket ID
   */
  getSessionByPlayerId(socketId) {
    for (const session of this.activeSessions.values()) {
      if (session.player1.socketId === socketId || session.player2.socketId === socketId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Mark player as disconnected (30 second reconnect window)
   */
  markDisconnected(socketId) {
    const session = this.getSessionByPlayerId(socketId);
    
    if (!session) return null;

    const isPlayer1 = session.player1.socketId === socketId;
    const player = isPlayer1 ? session.player1 : session.player2;

    player.connected = false;
    player.disconnectTime = Date.now();

    const timeoutId = setTimeout(() => {
      this.forfeitGame(session.sessionId, isPlayer1);
    }, 30000);

    player.reconnectTimeout = timeoutId;
    return session;
  }

  /**
   * Attempt to reconnect player
   * Returns: session or error
   */
  reconnect(socketId, username, sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Check if username matches
    const isPlayer1 = session.player1.username === username;
    const isPlayer2 = session.player2.username === username;

    if (!isPlayer1 && !isPlayer2) {
      return { success: false, error: 'Username does not match session' };
    }

    // Check if disconnection timeout expired (30 seconds)
    const player = isPlayer1 ? session.player1 : session.player2;
    const timeSinceDisconnect = Date.now() - player.disconnectTime;

    if (timeSinceDisconnect > 30000) {
      return { success: false, error: 'Reconnection window expired (30 seconds)' };
    }

    // Reconnect
    player.socketId = socketId;
    player.connected = true;
    player.disconnectTime = null;

    // Clear reconnect timeout
    if (player.reconnectTimeout) {
      clearTimeout(player.reconnectTimeout);
      player.reconnectTimeout = null;
    }

    return { success: true, session };
  }

  /**
   * Forfeit a game (player didn't reconnect in time)
   */
  forfeitGame(sessionId, isPlayer1) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || session.gameEngine.gameOver) return;

    session.gameEngine.gameOver = true;
    session.endTime = Date.now();
    session.result = 'forfeit';
    session.winner = isPlayer1 ? session.player2.username : session.player1.username;

    return session;
  }

  /**
   * End a game (normal completion)
   */
  endGame(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) return null;

    session.endTime = Date.now();

    if (session.gameEngine.isDraw) {
      session.result = 'draw';
    } else if (session.gameEngine.winner) {
      session.result = 'win';
      // Determine winner based on player IDs
      const winnerIsPlayer1 = session.gameEngine.currentPlayer === session.gameEngine.PLAYER1;
      session.winner = winnerIsPlayer1 ? session.player1.username : session.player2.username;
    }

    return session;
  }

  /**
   * Get leaderboard (top players)
   * This is called by DB service, but we can cache it here
   */
  getWaitingPlayerCount() {
    return this.waitingPlayers.size;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old sessions
   * (Optional: call periodically to avoid memory leak)
   */
  cleanupOldSessions(maxAgeMs = 3600000) { // 1 hour default
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.gameEngine.gameOver && (now - session.endTime) > maxAgeMs) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

module.exports = MatchmakingService;
