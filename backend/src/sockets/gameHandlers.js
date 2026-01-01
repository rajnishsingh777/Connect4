/**
 * GameSocketHandlers - Real-time game logic via Socket.IO
 * Manages: matchmaking, gameplay, move validation, reconnection
 */

const BotEngine = require('../engines/BotEngine');

module.exports = (io, matchmaker, kafkaProducer, databaseService) => {
  const gameUpdated = (sessionId) => {
    const session = matchmaker.getSession(sessionId);
    if (session) {
      const gameState = session.gameEngine.getGameState();
      gameState.player1 = session.player1.username;
      gameState.player2 = session.player2.username;
      console.log(`[GAME] Broadcasting state for ${sessionId}: currentPlayer=${gameState.currentPlayer}`);
      io.to(sessionId).emit('gameState', gameState);
    }
  };

  return {
    /**
     * Handle player joining queue for matchmaking
     */
    onJoinQueue: async (socket, { username, gameMode = 'bot' }) => {
      console.log(`[SOCKET] Player joining: ${username} (${socket.id}) - Mode: ${gameMode}`);

      if (!username || username.length < 2 || username.length > 20) {
        socket.emit('error', { message: 'Username must be 2-20 characters' });
        return;
      }

      const result = matchmaker.joinQueue(socket.id, username, socket, gameMode);

      if (result.error) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.username = username;

      if (result.isVsBot && gameMode === 'bot') {
        const session = matchmaker.getSession(result.sessionId);
        if (session) {
          const gameState = session.gameEngine.getGameState();
          gameState.player1 = session.player1.username;
          gameState.player2 = session.player2.username;
          
          socket.emit('gameMatched', {
            sessionId: result.sessionId,
            player1: session.player1.username,
            player2: 'ConnectBot',
            isVsBot: true,
            gameState: gameState
          });

          await kafkaProducer.sendGameStarted(session);
          console.log(`[SOCKET] Bot spawned immediately for: ${username}`);
        }
      } else if (result.paired) {
        const session = matchmaker.getSession(result.sessionId);
        
        const gameState = session.gameEngine.getGameState();
        gameState.player1 = session.player1.username;
        gameState.player2 = session.player2.username;
        
        io.to(result.sessionId).emit('gameMatched', {
          sessionId: result.sessionId,
          player1: session.player1.username,
          player2: session.player2.username,
          isVsBot: false,
          gameState: gameState
        });

        await kafkaProducer.sendGameStarted(session);
        console.log(`[SOCKET] Players matched: ${username} vs ${result.opponent}`);
      } else {
        socket.emit('waitingForOpponent', {
          message: 'Waiting for opponent (bot will spawn in 10 seconds if no one joins)'
        });

        console.log(`[SOCKET] Player waiting in human mode: ${username}`);
      }
    },

    /**
     * Handle player making a move
     */
    onMakeMove: async (socket, { sessionId, column }) => {
      console.log(`[MOVE] Received: sessionId=${sessionId}, column=${column}, socketId=${socket.id}`);
      const session = matchmaker.getSession(sessionId);
      if (!session) {
        console.log(`[MOVE] Session not found: ${sessionId}`);
        socket.emit('error', { message: 'Game session not found' });
        return;
      }

      if (column < 0 || column >= 7) {
        console.log(`[MOVE] Invalid column: ${column}`);
        socket.emit('error', { message: 'Invalid column' });
        return;
      }

      const isPlayer1 = session.player1.socketId === socket.id;
      const isPlayer2 = session.player2.socketId === socket.id;

      console.log(`[MOVE] Checking player: isPlayer1=${isPlayer1}, isPlayer2=${isPlayer2}`);
      console.log(`[MOVE] Player1 socket: ${session.player1.socketId}, Player2 socket: ${session.player2.socketId}`);

      if (!isPlayer1 && !isPlayer2) {
        console.log(`[MOVE] Not player's game`);
        socket.emit('error', { message: 'Not your game' });
        return;
      }

      const playerNumber = isPlayer1 ? session.gameEngine.PLAYER1 : session.gameEngine.PLAYER2;
      console.log(`[MOVE] Player ${playerNumber}, Current turn: ${session.gameEngine.currentPlayer}`);
      if (session.gameEngine.currentPlayer !== playerNumber) {
        console.log(`[MOVE] Not player's turn`);
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      const moveResult = session.gameEngine.dropPiece(column);
      if (!moveResult.success) {
        console.log(`[MOVE] Drop failed: ${moveResult.error}`);
        socket.emit('error', { message: moveResult.error });
        return;
      }

      console.log(`[MOVE] Successfully dropped piece at column ${column}, row ${moveResult.row}`);

      const player = isPlayer1 ? session.player1 : session.player2;
      await kafkaProducer.sendMovePlayed(session, column, moveResult.row, player);

      gameUpdated(sessionId);

      if (moveResult.gameOver) {
        session.endTime = Date.now();
        session.result = moveResult.isDraw ? 'draw' : 'win';
        session.winner = moveResult.winner ? 
          (moveResult.winner === session.gameEngine.PLAYER1 ? session.player1.username : session.player2.username) 
          : null;

        await kafkaProducer.sendGameEnded(session);
        await databaseService.saveGame(session);

        io.to(sessionId).emit('gameEnded', {
          result: session.result,
          winner: session.winner,
          duration: session.endTime - session.startTime
        });

        console.log(`[SOCKET] Game ended: ${sessionId}, Result: ${session.result}`);
        return;
      }

      if (session.isVsBot) {
        setTimeout(async () => {
          try {
            const botMoveResult = session.botEngine.makeMove();
            
            await kafkaProducer.sendMovePlayed(
              session,
              null,
              botMoveResult.row,
              session.player2
            );

            gameUpdated(sessionId);

            if (botMoveResult.gameOver) {
              session.endTime = Date.now();
              session.result = botMoveResult.isDraw ? 'draw' : 'win';
              session.winner = botMoveResult.winner === session.gameEngine.PLAYER2 ? 'ConnectBot' : session.player1.username;

              await kafkaProducer.sendGameEnded(session);
              await databaseService.saveGame(session);

              io.to(sessionId).emit('gameEnded', {
                result: session.result,
                winner: session.winner,
                duration: session.endTime - session.startTime
              });

              console.log(`[SOCKET] Game ended: ${sessionId}, Result: ${session.result}`);
            }
          } catch (error) {
            console.error('Bot move error:', error);
          }
        }, 500);
      }
    },

    /**
     * Handle player disconnect
     */
    onDisconnect: async (socket) => {
      console.log(`[SOCKET] Player disconnected: ${socket.username} (${socket.id})`);

      if (matchmaker.waitingPlayers.has(socket.id)) {
        matchmaker.waitingPlayers.delete(socket.id);
        const timeoutId = matchmaker.matchmakingTimeouts.get(socket.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          matchmaker.matchmakingTimeouts.delete(socket.id);
        }
        return;
      }

      const session = matchmaker.getSessionByPlayerId(socket.id);
      if (!session) return;

      matchmaker.markDisconnected(socket.id);
      await kafkaProducer.sendPlayerDisconnected(session, socket.username);

      io.to(session.sessionId).emit('playerDisconnected', {
        player: socket.username,
        message: 'Player disconnected. They have 30 seconds to reconnect.'
      });

      console.log(`[SOCKET] Player marked disconnected: ${socket.username}`);
    },

    /**
     * Handle player reconnection
     */
    onReconnect: async (socket, { username, sessionId }) => {
      const result = matchmaker.reconnect(socket.id, username, sessionId);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      const session = result.session;
      socket.username = username;
      socket.join(sessionId);

      if (session.player1.username === username) {
        session.player1.socketId = socket.id;
      } else {
        session.player2.socketId = socket.id;
      }

      io.to(sessionId).emit('playerReconnected', {
        player: username,
        gameState: session.gameEngine.getGameState()
      });

      console.log(`[SOCKET] Player reconnected: ${username}`);
    },

    /**
     * Handle leaderboard request
     */
    onGetLeaderboard: async (socket) => {
      const leaderboard = await databaseService.getLeaderboard(20);
      socket.emit('leaderboard', leaderboard);
    },

    /**
     * Handle player stats request
     */
    onGetPlayerStats: async (socket, { username }) => {
      const stats = await databaseService.getPlayerStats(username);
      if (stats) {
        socket.emit('playerStats', {
          username: stats.username,
          wins: stats.wins,
          losses: stats.losses,
          draws: stats.draws,
          totalGames: stats.totalGames,
          winRate: stats.winRate,
          averageGameDuration: stats.averageGameDuration
        });
      } else {
        socket.emit('playerStats', null);
      }
    }
  };
};

module.exports.gameUpdated = (io, sessionId, matchmaker) => {
  const session = matchmaker.getSession(sessionId);
  if (session) {
    const gameState = session.gameEngine.getGameState();
    gameState.player1 = session.player1.username;
    gameState.player2 = session.player2.username;
    io.to(sessionId).emit('gameState', gameState);
  }
};
