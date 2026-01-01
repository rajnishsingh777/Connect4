/**
 * PlayerStats - Display player statistics
 */

import React from 'react';
import './PlayerStats.css';

function PlayerStats({ stats }) {
  if (!stats) {
    return <div className="player-stats">Player not found</div>;
  }

  return (
    <div className="player-stats">
      <h3>📊 {stats.username}'s Stats</h3>
      <div className="stats-grid">
        <div className="stat">
          <span className="label">Total Games</span>
          <span className="value">{stats.totalGames}</span>
        </div>
        <div className="stat">
          <span className="label">Wins</span>
          <span className="value win">{stats.wins}</span>
        </div>
        <div className="stat">
          <span className="label">Losses</span>
          <span className="value loss">{stats.losses}</span>
        </div>
        <div className="stat">
          <span className="label">Draws</span>
          <span className="value draw">{stats.draws}</span>
        </div>
        <div className="stat">
          <span className="label">Win Rate</span>
          <span className="value">{stats.winRate?.toFixed(1)}%</span>
        </div>
        <div className="stat">
          <span className="label">Avg Game Duration</span>
          <span className="value">{Math.round(stats.averageGameDuration / 1000)}s</span>
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;
