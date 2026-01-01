# Frontend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm start
```

App will open at: `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── GameBoard.js        # 7x6 board UI
│   ├── GameBoard.css       # Board styling
│   ├── UsernameInput.js    # Username entry form
│   ├── UsernameInput.css   # Form styling
│   ├── GameStatus.js       # Turn indicator & info
│   ├── GameStatus.css      # Status styling
│   ├── Leaderboard.js      # Top players table
│   ├── Leaderboard.css     # Leaderboard styling
│   ├── PlayerStats.js      # Player statistics
│   └── PlayerStats.css     # Stats styling
├── App.js                  # Main component & game logic
├── App.css                 # Main styles
└── index.js                # React entry point

public/
└── index.html              # HTML template
```

## Component Overview

### App.js
Main component that:
- Manages Socket.IO connection
- Handles game state
- Controls page layout and flow
- Manages leaderboard/stats views

**Key State:**
- `socket` - WebSocket connection
- `username` - Current player
- `gameState` - Board, pieces, turn info
- `sessionId` - Current game ID
- `isInGame` - Playing or waiting
- `opponent` - Other player name
- `leaderboard` - Top players list
- `playerStats` - Own statistics

**Key Functions:**
- `handleJoinGame(username)` - Start matchmaking
- `handleMove(column)` - Drop disc in column
- `handlePlayAgain()` - Start new game
- `fetchLeaderboard()` - Get top players
- `fetchPlayerStats(username)` - Get own stats

### GameBoard.js
Renders the 7x6 board:
- Column selector (drop indicators)
- Board grid with pieces
- Column numbers at bottom
- Click-to-drop functionality

**Props:**
- `board` - 2D array of pieces
- `onColumnClick` - Move handler
- `currentPlayer` - Player 1 or 2
- `isCurrentPlayerTurn` - Can play?

### UsernameInput.js
Username entry form:
- Text input (2-20 chars)
- Validation
- Find match button
- Helpful tips

**Props:**
- `onJoin(username)` - Join game

### GameStatus.js
Displays current game info:
- Both player names with colors
- Current turn indicator
- Valid move columns
- Game over message

**Props:**
- `username` - Current player
- `opponent` - Other player
- `isVsBot` - Playing AI?
- `gameState` - Game data
- `isCurrentPlayer` - Is it your turn?

### Leaderboard.js
Top players ranking:
- Rank, name, wins, games, win rate
- Sortable columns (in CSS)

**Props:**
- `leaderboard` - Array of players

### PlayerStats.js
Personal statistics:
- Total games, wins, losses, draws
- Win rate percentage
- Average game duration

**Props:**
- `stats` - Player statistics

## Game Flow UI

```
1. User sees UsernameInput form
   ↓
2. Enters username and clicks "Find Match"
   ↓
3. Sees "Waiting for opponent..." message
   ↓
4. (Option A) Another player joins
   → GameBoard and GameStatus appear
   → Game starts

5. (Option B) 10 seconds pass
   → Bot spawns automatically
   → GameBoard and GameStatus appear
   → Game starts

6. Players take turns clicking columns
   → Disc drops
   → GameStatus updates with turn
   → Win/draw check

7. Game ends
   → GameResult shows winner
   → "Play Again" button appears

8. Click "Play Again"
   → Back to UsernameInput
   → Rejoin queue
```

## Styling Architecture

### Color Scheme
- **Primary**: Purple gradient (#667eea → #764ba2)
- **Player 1**: Red (#ef4444) - 🔴
- **Player 2**: Yellow (#fbbf24) - 🟡
- **Board**: Dark blue (#1e3a8a)
- **Text**: Dark gray (#333)
- **Accent**: White text on dark backgrounds

### Responsive Design
- Desktop: Full board width
- Tablet: Slightly reduced, centered
- Mobile: 100% width, touch-friendly

### Key Classes

**Layout:**
- `.app` - Main flex container
- `.app-header` - Top bar
- `.app-main` - Content area
- `.app-footer` - Bottom info

**Game:**
- `.game-container` - Game board wrapper
- `.board` - 7x6 grid
- `.cell` - Individual square
- `.disc` - Dropped piece
- `.column-selector` - Click zone

**Forms:**
- `.username-input` - Form wrapper
- `.btn-primary` / `.btn-secondary` - Buttons

**Data Display:**
- `.leaderboard` - Rankings table
- `.player-stats` - Stats grid
- `.stats-grid` - Multi-column layout

## Socket.IO Events

### Emitted (Client → Server)
```javascript
socket.emit('joinQueue', { username })
socket.emit('makeMove', { sessionId, column })
socket.emit('reconnect', { username, sessionId })
socket.emit('getLeaderboard')
socket.emit('getPlayerStats', { username })
```

### Received (Server → Client)
```javascript
socket.on('waitingForOpponent', { message })
socket.on('gameMatched', { sessionId, player1, player2, isVsBot, gameState })
socket.on('gameState', { board, currentPlayer, ... })
socket.on('gameEnded', { result, winner, duration })
socket.on('playerDisconnected', { player, message })
socket.on('playerReconnected', { player, gameState })
socket.on('leaderboard', [...])
socket.on('playerStats', {...})
socket.on('error', { message })
```

## API Endpoints Used

```javascript
// Fetch leaderboard
axios.get('http://localhost:3001/api/leaderboard?limit=20')

// Fetch player stats
axios.get('http://localhost:3001/api/player/:username')
```

## Game Board Visualization

```
Column selector (click to drop):
  [🔴] [🔴] [🔴] [🔴] [🔴] [🔴] [🔴]

Game board (7x6):
  [⚪] [🔴] [🔴] [⚪] [🟡] [⚪] [⚪]
  [⚪] [🔴] [🟡] [⚪] [🟡] [⚪] [⚪]
  [⚪] [🔴] [🟡] [🔴] [🟡] [⚪] [⚪]
  [⚪] [⚪] [⚪] [🔴] [⚪] [⚪] [⚪]
  [⚪] [⚪] [⚪] [⚪] [⚪] [⚪] [⚪]
  [⚪] [⚪] [⚪] [⚪] [⚪] [⚪] [⚪]

Column numbers:
  1  2  3  4  5  6  7
```

## State Management

### Game State Object
```javascript
{
  board: [[0,0,...], ...],      // 6x7 grid (0=empty, 1=player1, 2=player2)
  currentPlayer: 1 or 2,        // Whose turn
  gameOver: boolean,            // Game finished?
  winner: 1 or 2,               // Winner (if won)
  isDraw: boolean,              // Board full, no winner?
  moveHistory: [{row, col, player}, ...],  // All moves
  validMoves: [0,1,2,3,4,5,6]  // Available columns
}
```

### UI State
```javascript
{
  username: string,             // Current player
  opponent: string,             // Other player
  sessionId: string,            // Game ID
  isInGame: boolean,            // Game active?
  isWaiting: boolean,           // Waiting screen?
  isVsBot: boolean,             // Playing AI?
  gameResult: {...},            // Win/draw info
  leaderboard: [...],           // Top players
  playerStats: {...}            // Own stats
}
```

## Error Handling

Errors are displayed in a red banner:
- "Invalid username"
- "Username already in game"
- "Invalid column"
- "Column is full"
- "Not your turn"
- "Player disconnected" (with reconnect timer)

Errors auto-clear when user takes action.

## Performance Optimizations

1. **Socket.IO Optimization**
   - Single connection per browser
   - Auto-reconnect enabled
   - Efficient room-based broadcasting

2. **Rendering**
   - React prevents unnecessary re-renders
   - CSS animations, no JS animations
   - Event debouncing on moves

3. **CSS**
   - Minimal CSS
   - CSS Grid for board (fast)
   - No animations on every render
   - Gradient backgrounds (GPU accelerated)

4. **Data Updates**
   - Only update when needed
   - Leaderboard cached client-side
   - Stats fetched on demand

## Responsive Breakpoints

### Desktop (>= 768px)
- Full board display
- Sidebar elements
- Normal font sizes

### Tablet (480px - 768px)
- Medium board size
- Stacked layout
- Adjusted padding

### Mobile (< 480px)
- Small board (fits screen)
- Single column layout
- Touch-friendly buttons
- Minimal text

## Testing Scenarios

### Basic Gameplay
1. Start game
2. Click a column
3. See disc drop
4. Opponent's turn appears
5. Continue until win/draw

### Multiplayer
1. Open 2 browser windows
2. Enter different names
3. Both join within 10s
4. Game starts
5. Moves sync in real-time

### Bot Gameplay
1. Open 1 window
2. Wait 10 seconds
3. Bot joins
4. Watch bot play intelligently

### Leaderboard
1. Click "View Leaderboard"
2. See sorted list
3. Click "Hide Leaderboard"
4. Close/minimize

### Stats
1. Click "My Stats" (only shows with username)
2. View personal statistics
3. Compare with leaderboard

## Common Issues

**"Cannot read property 'map' of undefined"**
- Likely gameState is null
- Check Socket.IO connection
- Verify server is running

**Board appears empty**
- Check gameState.board is populated
- Verify board array dimensions (6x7)
- Check piece colors in CSS

**Moves not syncing**
- Check Socket.IO connection
- Verify room join worked
- Check 'gameState' event received

**Username validation failing**
- Must be 2-20 characters
- No spaces at start/end
- Clear cache if stuck

## Build & Deployment

### Development
```bash
npm start
```

### Production Build
```bash
npm run build
```

Creates `build/` folder for deployment.

### Docker Deployment
```dockerfile
FROM node:16 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Config
Create `.env.production` for server URL:
```
REACT_APP_SOCKET_URL=https://your-domain.com
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

---

For more details, see main [README.md](../README.md)
