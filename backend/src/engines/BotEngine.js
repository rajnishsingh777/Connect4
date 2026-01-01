/**
 * BotEngine - AI opponent for Connect Four
 * Strategy: Win immediately, block opponent wins, prefer center columns
 */

class BotEngine {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  /**
   * Get best move for bot
   * Returns column (0-6)
   */
  getBestMove() {
    const validMoves = this.gameEngine.getValidMoves();
    
    if (validMoves.length === 0) {
      return -1;
    }

    const botPlayer = this.gameEngine.PLAYER2;
    const opponent = this.gameEngine.PLAYER1;

    for (const col of validMoves) {
      const score = this.gameEngine.evaluateMove(col, botPlayer);
      if (score >= 10000) {
        return col;
      }
    }

    for (const col of validMoves) {
      const score = this.gameEngine.evaluateMove(col, opponent);
      if (score >= 10000) {
        return col;
      }
    }

    let bestCol = validMoves[0];
    let bestScore = this.gameEngine.evaluateMove(validMoves[0], botPlayer);

    for (const col of validMoves) {
      const score = this.gameEngine.evaluateMove(col, botPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    return bestCol;
  }

  /**
   * Execute bot move and return game state
   */
  makeMove() {
    const col = this.getBestMove();
    
    if (col === -1) {
      throw new Error('No valid moves available');
    }

    return this.gameEngine.dropPiece(col);
  }
}

module.exports = BotEngine;
