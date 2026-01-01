/**
 * Leaderboard - Display top players
 */

import React from 'react';
import './Leaderboard.css';

function Leaderboard({ leaderboard }) {
  return (
    <div className="leaderboard">
      <h3>🏆 Top Players</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Total Games</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, idx) => (
            <tr key={player._id}>
              <td className="rank">#{idx + 1}</td>
              <td className="name">{player.username}</td>
              <td className="wins">{player.wins}</td>
              <td className="games">{player.totalGames}</td>
              <td className="rate">{player.winRate?.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
