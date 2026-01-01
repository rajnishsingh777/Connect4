/**
 * GameStatus - Show current game status and player info
 */

import React from 'react';
import './GameStatus.css';

function GameStatus({ username, opponent, isVsBot, gameState, isCurrentPlayer }) {
  return (
    <div className="game-status">
      <div className="player-info">
        <div className={`player ${isCurrentPlayer && !gameState.gameOver ? 'active' : ''}`}>
          <span className="disc-indicator player1">🔴</span>
          <span className="name">{username}</span>
        </div>
        <div className="vs">vs</div>
        <div className={`player ${!isCurrentPlayer && !gameState.gameOver ? 'active' : ''}`}>
          <span className="disc-indicator player2">🟡</span>
          <span className="name">
            {opponent}
            {isVsBot && ' (AI)'}
          </span>
        </div>
      </div>

      <div className="game-info">
        {gameState.gameOver ? (
          <p className="game-over-message">
            {gameState.isDraw
              ? '🤝 Game Over - Draw!'
              : gameState.winner === 1
              ? `🎉 ${username} Wins!`
              : `🎉 ${opponent} Wins!`}
          </p>
        ) : (
          <p className="turn-message">
            {isCurrentPlayer ? '👆 Your turn' : '⏳ Opponent turn'}
          </p>
        )}

        <div className="valid-moves">
          <p>Valid columns: {gameState.validMoves.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}

export default GameStatus;
