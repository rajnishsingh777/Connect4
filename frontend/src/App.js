/**
 * Connect Four - React Frontend
 * Main App Component
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import GameBoard from './components/GameBoard';
import UsernameInput from './components/UsernameInput';
import Leaderboard from './components/Leaderboard';
import PlayerStats from './components/PlayerStats';
import GameStatus from './components/GameStatus';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://connect4-8j5i.onrender.com';

function App() {
  // Game state
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [gameState, setGameState] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [isInGame, setIsInGame] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [isVsBot, setIsVsBot] = useState(false);
  const [error, setError] = useState('');
  const [gameResult, setGameResult] = useState(null);
  const [gameMode, setGameMode] = useState(null); // 'bot' or 'human' - null means user needs to choose
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // Leaderboard and stats
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    console.log('Initializing socket connection to:', SOCKET_URL);
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server, socket ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    newSocket.on('waitingForOpponent', (data) => {
      console.log('Waiting for opponent');
      setIsWaiting(true);
      setError('');
    });

    newSocket.on('gameMatched', (data) => {
      console.log('Game matched:', data);
      setIsInGame(true);
      setIsWaiting(false);
      setSessionId(data.sessionId);
      setOpponent(data.player2);
      setIsVsBot(data.isVsBot);
      setGameState(data.gameState);
      setGameResult(null);
      setError('');
      setGameMode(null);
    });

    newSocket.on('gameState', (state) => {
      console.log('Game state updated:', state);
      setGameState(state);
    });

    newSocket.on('gameEnded', (data) => {
      setGameResult(data);
      setIsInGame(false);
      if (playerStats) {
        fetchPlayerStats(username);
      }
      fetchLeaderboard();
    });

    newSocket.on('playerDisconnected', (data) => {
      setError(`${data.player} disconnected. They have 30 seconds to reconnect.`);
    });

    newSocket.on('playerReconnected', (data) => {
      setError('');
      setGameState(data.gameState);
    });

    newSocket.on('leaderboard', (data) => {
      setLeaderboard(data);
    });

    newSocket.on('playerStats', (data) => {
      setPlayerStats(data);
    });

    newSocket.on('error', (data) => {
      setError(data.message);
      setIsWaiting(false);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [playerStats, username]);

  /**
   * Join game queue
   */
  const handleJoinGame = (playerUsername, mode = 'bot') => {
    if (!socket) return;
    
    setUsername(playerUsername);
    setGameMode(mode);
    setError('');
    setIsWaiting(true);
    console.log(`Joining queue as "${playerUsername}" - Mode: ${mode}`);
    socket.emit('joinQueue', { username: playerUsername, gameMode: mode });
  };

  /**
   * Show game mode selector
   */
  const handleSelectGameMode = (playerUsername) => {
    setUsername(playerUsername);
    setShowModeSelector(true);
  };

  /**
   * Make a move
   */
  const handleMove = (column) => {
    console.log('Move clicked - column:', column, 'socket:', socket ? 'connected' : 'disconnected', 'isInGame:', isInGame);
    if (!socket || !isInGame) {
      console.log('Cannot move: socket exists?', !!socket, 'isInGame?', isInGame);
      return;
    }
    
    console.log('Emitting makeMove:', { sessionId, column });
    socket.emit('makeMove', { sessionId, column });
  };

  /**
   * Play again
   */
  const handlePlayAgain = () => {
    if (!socket) return;
    
    setGameState(null);
    setGameResult(null);
    setSessionId('');
    setIsInGame(false);
    setOpponent('');
    setIsWaiting(false);
    setShowModeSelector(true);
  };

  /**
   * Fetch leaderboard
   */
  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/leaderboard?limit=20');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  /**
   * Fetch player stats
   */
  const fetchPlayerStats = async (playerUsername) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/player/${playerUsername}`);
      setPlayerStats(response.data);
    } catch (error) {
      console.error('Error fetching player stats:', error);
      setPlayerStats(null);
    }
  };

  /**
   * View leaderboard
   */
  const handleViewLeaderboard = async () => {
    await fetchLeaderboard();
    setShowLeaderboard(!showLeaderboard);
  };

  /**
   * View own stats
   */
  const handleViewStats = async () => {
    if (username) {
      await fetchPlayerStats(username);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Connect Four</h1>
        <div className="header-buttons">
          <button onClick={handleViewLeaderboard} className="btn btn-secondary">
            {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
          </button>
          {username && (
            <button onClick={handleViewStats} className="btn btn-secondary">
              My Stats
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-message">{error}</div>}

        {!isInGame && !isWaiting && !gameResult && !showModeSelector && (
          <UsernameInput onJoin={handleSelectGameMode} />
        )}

        {!isInGame && !isWaiting && !gameResult && showModeSelector && (
          <div className="mode-selector">
            <h2>Choose Your Opponent</h2>
            <button onClick={() => handleJoinGame(username, 'bot')} className="btn btn-primary">
              Bot
            </button>
            <button onClick={() => handleJoinGame(username, 'human')} className="btn btn-primary">
              Human Player
            </button>
            <button onClick={() => setShowModeSelector(false)} className="btn btn-secondary">
              Back
            </button>
          </div>
        )}

        {isWaiting && (
          <div className="waiting">
            <p>Waiting for opponent...</p>
            <p className="small">
              {gameMode === 'bot' 
                ? 'Starting game with bot...' 
                : 'Waiting for another player (bot will appear in 10 seconds)'}
            </p>
          </div>
        )}

        {isInGame && gameState && (
          <div className="game-container">
            <GameStatus
              username={username}
              opponent={opponent}
              isVsBot={isVsBot}
              gameState={gameState}
              isCurrentPlayer={
                gameState.currentPlayer === 1
                  ? username === gameState.player1
                  : username === gameState.player2
              }
            />
            <GameBoard
              board={gameState.board}
              onColumnClick={handleMove}
              currentPlayer={gameState.currentPlayer}
              isCurrentPlayerTurn={
                gameState.currentPlayer === 1
                  ? username === gameState.player1
                  : username === gameState.player2
              }
            />
          </div>
        )}

        {gameResult && (
          <div className="game-result">
            <h2>
              {gameResult.result === 'draw'
                ? "It's a Draw!"
                : `${gameResult.winner} Wins!`}
            </h2>
            <p>Game Duration: {Math.round(gameResult.duration / 1000)}s</p>
            <button onClick={handlePlayAgain} className="btn btn-primary">
              Play Again
            </button>
          </div>
        )}

        {showLeaderboard && (
          <Leaderboard leaderboard={leaderboard} />
        )}

        {playerStats && (
          <PlayerStats stats={playerStats} />
        )}
      </main>

      <footer className="app-footer">
        <p>Connect Four - Real-time Multiplayer Game</p>
      </footer>
    </div>
  );
}

export default App;
