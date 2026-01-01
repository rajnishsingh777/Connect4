/**
 * GameEngine - Core Connect Four logic
 * Manages board state, move validation, win/draw detection
 */

class GameEngine {
  constructor() {
    // 6 rows x 7 columns board
    this.ROWS = 6;
    this.COLS = 7;
    this.EMPTY = 0;
    this.PLAYER1 = 1;
    this.PLAYER2 = 2;
    
    // Initialize empty board
    this.board = this.initializeBoard();
    this.currentPlayer = this.PLAYER1;
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
    this.isDraw = false;
  }

  /**
   * Initialize empty 6x7 board
   */
  initializeBoard() {
    return Array(this.ROWS)
      .fill(null)
      .map(() => Array(this.COLS).fill(this.EMPTY));
  }

  /**
   * Drop a piece in a column
   * Returns: { success, error?, row?, col? }
   */
  dropPiece(col) {
    if (col < 0 || col >= this.COLS) {
      return { success: false, error: 'Invalid column' };
    }

    if (this.board[0][col] !== this.EMPTY) {
      return { success: false, error: 'Column is full' };
    }

    let row = -1;
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === this.EMPTY) {
        row = r;
        break;
      }
    }

    this.board[row][col] = this.currentPlayer;
    this.moveHistory.push({ row, col, player: this.currentPlayer });

    const hasWon = this.checkWin(row, col, this.currentPlayer);
    if (hasWon) {
      this.gameOver = true;
      this.winner = this.currentPlayer;
      return { success: true, row, col, gameOver: true, winner: this.currentPlayer };
    }

    if (this.isBoardFull()) {
      this.gameOver = true;
      this.isDraw = true;
      return { success: true, row, col, gameOver: true, isDraw: true };
    }

    this.currentPlayer = this.currentPlayer === this.PLAYER1 ? this.PLAYER2 : this.PLAYER1;

    return { success: true, row, col, gameOver: false };
  }

  /**
   * Check if a player won at position (row, col)
   * Checks: horizontal, vertical, diagonal-down, diagonal-up
   */
  checkWin(row, col, player) {
    // Check horizontal
    if (this.countConsecutive(row, col, 0, 1, player) >= 4) return true;

    // Check vertical
    if (this.countConsecutive(row, col, 1, 0, player) >= 4) return true;

    // Check diagonal (top-left to bottom-right)
    if (this.countConsecutive(row, col, 1, 1, player) >= 4) return true;

    // Check diagonal (top-right to bottom-left)
    if (this.countConsecutive(row, col, 1, -1, player) >= 4) return true;

    return false;
  }

  /**
   * Count consecutive pieces in a direction
   * Direction: (dr, dc) where dr/dc are -1, 0, or 1
   */
  countConsecutive(row, col, dr, dc, player) {
    let count = 1; // Count the piece at (row, col)

    // Count in positive direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
      if (this.board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      } else {
        break;
      }
    }

    // Count in negative direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS) {
      if (this.board[r][c] === player) {
        count++;
        r -= dr;
        c -= dc;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Check if board is completely full (draw)
   */
  isBoardFull() {
    for (let col = 0; col < this.COLS; col++) {
      if (this.board[0][col] === this.EMPTY) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get valid moves (columns that aren't full)
   */
  getValidMoves() {
    const validMoves = [];
    for (let col = 0; col < this.COLS; col++) {
      if (this.board[0][col] === this.EMPTY) {
        validMoves.push(col);
      }
    }
    return validMoves;
  }

  /**
   * Get current board state (copy)
   */
  getBoard() {
    return this.board.map(row => [...row]);
  }

  /**
   * Get game state object
   */
  getGameState() {
    return {
      board: this.getBoard(),
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      isDraw: this.isDraw,
      moveHistory: [...this.moveHistory],
      validMoves: this.getValidMoves()
    };
  }

  /**
   * Reset game
   */
  reset() {
    this.board = this.initializeBoard();
    this.currentPlayer = this.PLAYER1;
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
    this.isDraw = false;
  }

  /**
   * Get move score for bot evaluation
   * Used for bot strategy: scoring positions
   */
  evaluateMove(col, player) {
    // Simulate the move
    let row = -1;
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === this.EMPTY) {
        row = r;
        break;
      }
    }

    if (row === -1) return -1000; // Invalid move

    // Temporarily place piece
    this.board[row][col] = player;

    // Check if this move wins
    if (this.checkWin(row, col, player)) {
      this.board[row][col] = this.EMPTY;
      return 10000; // Winning move
    }

    // Check if this move blocks opponent
    const opponent = player === this.PLAYER1 ? this.PLAYER2 : this.PLAYER1;
    this.board[row][col] = opponent;
    if (this.checkWin(row, col, opponent)) {
      this.board[row][col] = this.EMPTY;
      return 8000; // Blocking move
    }

    this.board[row][col] = this.EMPTY;

    // Count pieces and threats in this column
    let score = 0;
    
    // Prefer center columns
    const centerDistance = Math.abs(col - 3);
    score += (3 - centerDistance) * 100;

    // Count adjacent pieces
    score += this.countAdjacentPieces(row, col, player) * 50;

    return score;
  }

  /**
   * Count adjacent pieces of same player
   */
  countAdjacentPieces(row, col, player) {
    let count = 0;
    const directions = [
      [0, 1], [0, -1],        // horizontal
      [1, 0], [-1, 0],        // vertical
      [1, 1], [-1, -1],       // diagonal \
      [1, -1], [-1, 1]        // diagonal /
    ];

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS) {
        if (this.board[nr][nc] === player) count++;
      }
    }

    return count;
  }
}

module.exports = GameEngine;
