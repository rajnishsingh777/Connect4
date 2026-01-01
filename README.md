# Connect Four - Real-time Multiplayer Game

A complete, production-ready Connect Four game built with modern technologies. Play against other players in real-time or challenge our intelligent AI bot.

## 🎮 Features

- **Real-time Multiplayer**: Play against other players with Socket.IO
- **AI Bot**: Intelligent bot opponent if no player joins within 10 seconds
- **Smart Bot Strategy**:
  1. Wins immediately if possible
  2. Blocks opponent's winning move
  3. Prefers center columns
  4. Evaluates move scores for optimal play
- **Player Reconnection**: Rejoin your game within 30 seconds if disconnected
- **Leaderboard**: View top players ranked by wins
- **Player Stats**: Track wins, losses, draws, win rate, and average game duration
- **Kafka Analytics**: Real-time event streaming and analytics
- **MongoDB Persistence**: All games and player stats are saved
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🏗️ Architecture

### Backend Stack
- **Node.js + Express**: RESTful API server
- **Socket.IO**: Real-time WebSocket communication
- **MongoDB + Mongoose**: Data persistence
- **Kafka**: Event streaming for analytics
- **KafkaJS**: Kafka producer/consumer

### Frontend Stack
- **React 18**: UI framework
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP requests
- **CSS3**: Responsive styling

### Core Components

```
connect4/
├── backend/
│   ├── src/
│   │   ├── engines/
│   │   │   ├── GameEngine.js      # 7x6 board logic, win detection
│   │   │   └── BotEngine.js       # Intelligent bot strategy
│   │   ├── models/
│   │   │   └── schemas.js         # MongoDB schemas
│   │   ├── services/
│   │   │   ├── MatchmakingService.js  # Queue & pairing logic
│   │   │   └── DatabaseService.js     # Persistence layer
│   │   ├── kafka/
│   │   │   ├── KafkaProducer.js   # Event producer
│   │   │   └── KafkaConsumer.js   # Event consumer & analytics
│   │   ├── sockets/
│   │   │   └── gameHandlers.js    # Socket.IO event handlers
│   │   └── server.js              # Express server setup
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── GameBoard.js        # Board UI (7x6 grid)
    │   │   ├── UsernameInput.js    # Username entry
    │   │   ├── GameStatus.js       # Current turn & game info
    │   │   ├── Leaderboard.js      # Top players
    │   │   └── PlayerStats.js      # Player statistics
    │   ├── App.js                  # Main component
    │   ├── App.css                 # Main styles
    │   └── index.js                # React entry point
    ├── public/
    │   └── index.html              # HTML template
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 14+
- MongoDB (running on localhost:27017)
- Kafka (optional, running on localhost:9092)

### Installation

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed (MongoDB URI, Kafka brokers, etc.)
npm run dev  # or npm start for production
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start  # Starts on http://localhost:3000
```

### Environment Variables (Backend)

```env
PORT=3001                                    # Server port
MONGODB_URI=mongodb://localhost:27017/connect4  # MongoDB connection
KAFKA_BROKERS=localhost:9092               # Kafka brokers (comma-separated)
NODE_ENV=development
```

## 📋 Game Rules

- **Board**: 7 columns × 6 rows
- **Players**: Drop discs from the top
- **Win**: Get 4 in a row (horizontal, vertical, or diagonal)
- **Draw**: Board is full with no winner
- **Reconnection**: Player has 30 seconds to reconnect after disconnect

## 🤖 Bot Strategy

The bot uses a strategic decision tree:

1. **Winning Move** (Score: 10,000)
   - If bot can win immediately, take that move

2. **Blocking Move** (Score: 8,000)
   - If opponent can win, block that move

3. **Positional Scoring**
   - Center columns preferred (columns 2-4 are better)
   - Adjacent friendly pieces increase score
   - Threats nearby increase score

4. **Best Score Selection**
   - Choose move with highest total score

This ensures the bot plays intelligently without randomness.

## 📡 Socket.IO Events

### Client → Server
```javascript
// Join matchmaking queue
socket.emit('joinQueue', { username: 'PlayerName' })

// Make a move (0-6 for columns)
socket.emit('makeMove', { sessionId, column: 3 })

// Reconnect to game
socket.emit('reconnect', { username, sessionId })

// Get leaderboard
socket.emit('getLeaderboard')

// Get player stats
socket.emit('getPlayerStats', { username })
```

### Server → Client
```javascript
// Waiting for opponent
socket.on('waitingForOpponent', { message })

// Game matched, ready to play
socket.on('gameMatched', { sessionId, player1, player2, isVsBot, gameState })

// Game state updated
socket.on('gameState', { board, currentPlayer, gameOver, winner, isDraw, validMoves })

// Game ended
socket.on('gameEnded', { result, winner, duration })

// Player disconnected
socket.on('playerDisconnected', { player, message })

// Player reconnected
socket.on('playerReconnected', { player, gameState })

// Leaderboard data
socket.on('leaderboard', [...])

// Player stats
socket.on('playerStats', { username, wins, losses, draws, ... })

// Error
socket.on('error', { message })
```

## 🎯 REST API Endpoints

### Health Check
```
GET /health
Response: { status, timestamp, waitingPlayers, activeSessions }
```

### Get Leaderboard
```
GET /api/leaderboard?limit=20
Response: [{ username, rank, wins, losses, draws, totalGames, winRate }, ...]
```

### Get Player Stats
```
GET /api/player/:username
Response: { username, wins, losses, draws, totalGames, winRate, averageGameDuration }
```

### Get Analytics
```
GET /api/analytics
Response: { totalGames, averageGameDuration, mostFrequentWinners, gameResults, gamesPerHour }
```

## 📊 Kafka Events

The system emits four types of events:

```javascript
// Event types: GAME_STARTED, MOVE_PLAYED, GAME_ENDED, PLAYER_DISCONNECTED

{
  eventType: 'GAME_STARTED',
  sessionId: 'game_1234567890_abc123def',
  player1: 'Alice',
  player2: 'Bob',
  isVsBot: false,
  timestamp: '2025-01-01T12:00:00Z'
}

{
  eventType: 'MOVE_PLAYED',
  sessionId: '...',
  player1: 'Alice',
  player2: 'Bob',
  moveColumn: 3,
  moveRow: 5,
  moveMadeBy: 'Alice',
  timestamp: '...'
}

{
  eventType: 'GAME_ENDED',
  sessionId: '...',
  gameResult: 'win',
  winner: 'Alice',
  gameDuration: 45000,  // milliseconds
  moveCount: 12,
  timestamp: '...'
}

{
  eventType: 'PLAYER_DISCONNECTED',
  sessionId: '...',
  disconnectedPlayer: 'Bob',
  timestamp: '...'
}
```

## 📦 MongoDB Collections

### Games
```javascript
{
  sessionId: String,
  player1: { username, isBot },
  player2: { username, isBot },
  winner: String,
  result: 'win' | 'draw' | 'forfeit',
  duration: Number,
  moveCount: Number,
  board: [[Number]],
  startedAt: Date,
  endedAt: Date,
  createdAt: Date
}
```

### Players
```javascript
{
  username: String,
  wins: Number,
  losses: Number,
  draws: Number,
  forfeits: Number,
  totalGames: Number,
  winRate: Number,  // percentage
  totalDuration: Number,
  averageGameDuration: Number,
  lastGameAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Leaderboard
```javascript
{
  username: String,
  rank: Number,
  wins: Number,
  losses: Number,
  draws: Number,
  totalGames: Number,
  winRate: Number,
  lastUpdated: Date
}
```

### AnalyticsEvents
```javascript
{
  eventType: String,
  sessionId: String,
  player1: String,
  player2: String,
  isVsBot: Boolean,
  moveColumn: Number,
  moveRow: Number,
  moveMadeBy: String,
  gameResult: String,
  gameDuration: Number,
  timestamp: Date
}
```

## 🔄 Game Flow

```
1. Player enters username and joins queue
   ↓
2. Wait 10 seconds for opponent
   ├─ If opponent joins → Start multiplayer game
   └─ If no opponent → Spawn AI bot
   ↓
3. Game starts - Player 1 (Red) goes first
   ↓
4. Players alternate dropping discs
   ↓
5. After each move:
   ├─ Check for win (4 in a row)
   ├─ Check for draw (board full)
   └─ Switch turn to other player
   ↓
6. Game ends (win/draw/forfeit)
   ↓
7. Save game and update player stats
   ↓
8. Show result, option to play again
```

## 🔌 Reconnection Flow

```
Player disconnects
   ↓
Server marks player as disconnected (30 second window)
   ↓
Send PLAYER_DISCONNECTED Kafka event
   ↓
Player tries to reconnect with username + sessionId
   ├─ If within 30 seconds → Restore game
   └─ If after 30 seconds → Forfeit game
   ↓
Continue or end game accordingly
```

## 🎮 Example Game Session

```
1. Alice joins, username = "Alice"
   → Waiting for opponent (10 second timer)

2. Bob joins, username = "Bob"
   → Match created: Alice vs Bob
   → GAME_STARTED event sent to Kafka

3. Alice plays column 3
   → Disc lands at row 5, column 3
   → MOVE_PLAYED event sent
   → Game state updated: now Bob's turn

4. Bob plays column 4
   → Disc lands at row 5, column 4
   → MOVE_PLAYED event sent

5. ... (game continues)

6. Alice plays winning move (4th in a row)
   → Game marked as won by Alice
   → GAME_ENDED event sent with result='win'
   → Game saved to MongoDB
   → Alice's stats updated: wins++
   → Bob's stats updated: losses++
   → Leaderboard recalculated
```

## 🧪 Testing Scenarios

### Test Multiplayer Game
1. Open two browser windows
2. Enter different usernames
3. One should see "Waiting", other should join within 10 seconds
4. Game starts immediately

### Test Bot Game
1. Open one browser window
2. Wait 10 seconds
3. Bot spawns automatically
4. Watch bot make intelligent moves

### Test Reconnection
1. Start game with two players
2. Refresh one player's browser mid-game
3. Reconnect with same username and sessionId
4. Game state should be restored
5. Game continues normally

### Test Win Detection
- Horizontal: 4 in a row in same row
- Vertical: 4 in same column
- Diagonal: 4 in diagonal direction both ways
- Draw: Fill board with no winner

## 📈 Performance Notes

- **In-memory Game Sessions**: Fast access, auto-cleaned periodically
- **Lazy Leaderboard Updates**: Updated after each game completes
- **Kafka Async**: Events sent non-blocking, consumer processes separately
- **MongoDB Indexes**: Sessions indexed on columns for quick lookups
- **WebSocket Connection**: Single socket per player, auto-reconnect enabled

## 🔐 Security Considerations

For production, add:
- Input validation on all inputs
- Rate limiting on API endpoints
- Session tokens/JWT for authentication
- HTTPS/WSS for encrypted communication
- CORS configuration tightened
- MongoDB auth credentials
- Kafka SASL/SSL authentication

## 📝 Development Notes

- **Game Engine**: Pure logic, no dependencies
- **Bot Engine**: Uses game engine's evaluation, no randomness
- **Matchmaking**: In-memory Map for O(1) lookups
- **Socket Rooms**: Each game is a Socket.IO room
- **Database**: Async operations don't block game logic
- **Kafka**: Gracefully handles connection failures (optional)

## 🤝 Contributing

This is a complete, production-like implementation. Extensions could include:
- User authentication system
- Ranking tiers/divisions
- Daily/weekly tournaments
- Chat system
- Replay functionality
- Mobile app version
- ELO rating system

## 📄 License

MIT License - Feel free to use and modify

---

Built with ❤️ using Node.js, React, Socket.IO, MongoDB, and Kafka
