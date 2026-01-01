/**
 * UsernameInput - Component for player to enter username
 */

import React, { useState } from 'react';
import './UsernameInput.css';

function UsernameInput({ onJoin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.length < 2 || username.length > 20) {
      setError('Username must be 2-20 characters');
      return;
    }

    setError('');
    onJoin(username.trim());
  };

  return (
    <div className="username-input">
      <h2>Join the Game</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          maxLength="20"
          autoFocus
        />
        <button type="submit" className="btn btn-primary">
          Find Match
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="info">
        💡 You'll be matched with another player. If no one joins within 10 seconds, 
        you'll play against our AI bot!
      </p>
    </div>
  );
}

export default UsernameInput;
