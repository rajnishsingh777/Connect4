/**
 * GameBoard - 7x6 Connect Four board UI
 */

import React from 'react';
import './GameBoard.css';

function GameBoard({ board, onColumnClick, currentPlayer, isCurrentPlayerTurn }) {
  const COLS = board[0].length;

  const getDiscColor = (cell) => {
    if (cell === 0) return 'empty';
    if (cell === 1) return 'player1'; // Red
    if (cell === 2) return 'player2'; // Yellow
    return 'empty';
  };

  const handleColumnClick = (col) => {
    console.log('🖱️ Column clicked:', col, 'isCurrentPlayerTurn:', isCurrentPlayerTurn);
    if (isCurrentPlayerTurn) {
      console.log('✓ Player turn - calling onColumnClick');
      onColumnClick(col);
    } else {
      console.log('✗ Not player turn - ignoring click');
    }
  };

  return (
    <div className="gameboard">
      <div className="board-container">
        {/* Column hover indicator */}
        <div className="column-selector">
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={`selector-${col}`}
              className={`column-indicator ${isCurrentPlayerTurn ? 'active' : ''}`}
              onClick={() => handleColumnClick(col)}
            >
              {currentPlayer === 1 ? '🔴' : '🟡'}
            </div>
          ))}
        </div>

        {/* Board cells */}
        <div className="board">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`cell ${getDiscColor(cell)}`}
              >
                <div className="disc" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Column labels */}
      <div className="column-labels">
        {Array.from({ length: COLS }).map((_, col) => (
          <div key={`label-${col}`} className="column-label">
            {col + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameBoard;
