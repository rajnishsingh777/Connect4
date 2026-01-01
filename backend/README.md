# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env if using non-standard MongoDB/Kafka addresses
```

### 3. Ensure Services Running

#### MongoDB
```bash
# If using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install locally and run
mongod
```

#### Kafka (Optional - Analytics)
```bash
# If using Docker Compose
docker run -d -p 9092:9092 --env KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 --env KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 confluentinc/cp-kafka:latest

# Or follow Kafka installation guide
```

### 4. Start Server
```bash
npm run dev    # Development mode with nodemon
# or
npm start      # Production mode
```

Server will be available at: `http://localhost:3001`

## Project Structure

```
src/
├── engines/
│   ├── GameEngine.js       # Core game logic
│   └── BotEngine.js        # AI opponent
├── models/
│   └── schemas.js          # MongoDB schemas
├── services/
│   ├── MatchmakingService.js  # Queue & game creation
│   └── DatabaseService.js     # Data persistence
├── kafka/
│   ├── KafkaProducer.js    # Send events
│   └── KafkaConsumer.js    # Consume events
├── sockets/
│   └── gameHandlers.js     # WebSocket handlers
└── server.js               # Express + Socket.IO
```

## Key Components Explained

### GameEngine (engines/GameEngine.js)
- 7x6 board representation
- Drop piece logic
- Win detection (4 directions)
- Draw detection
- Move validation
- Board evaluation for bot

**Key Methods:**
- `dropPiece(col)` - Place disc in column
- `checkWin(row, col, player)` - Check if won
- `getValidMoves()` - Available columns
- `evaluateMove(col, player)` - Score for move

### BotEngine (engines/BotEngine.js)
- Intelligent move selection
- 4-step strategy:
  1. Win if possible (10,000 points)
  2. Block opponent win (8,000 points)
  3. Prefer center columns (up to 300 points)
  4. Highest score wins

**Key Methods:**
- `getBestMove()` - Returns best column (0-6)
- `makeMove()` - Execute move and return result

### MatchmakingService (services/MatchmakingService.js)
- Player queue management
- Player-to-player pairing
- Bot spawning after 10 seconds
- Session creation and storage
- Disconnect/reconnect handling
- 30-second reconnection window

**Key Methods:**
- `joinQueue(socketId, username)` - Queue player
- `tryPairPlayers(socketId)` - Pair two players
- `spawnBotOpponent(socketId)` - Create bot game
- `createSession(...)` - New game session
- `markDisconnected(socketId)` - Handle disconnect
- `reconnect(socketId, username, sessionId)` - Restore connection
- `forfeitGame(sessionId, isPlayer1)` - End on timeout

### DatabaseService (services/DatabaseService.js)
- MongoDB operations
- Game persistence
- Player stats tracking
- Leaderboard generation
- Analytics queries

**Key Methods:**
- `connect(mongoUri)` - Connect to MongoDB
- `saveGame(session)` - Save completed game
- `updatePlayerStats(...)` - Update records
- `updateLeaderboard()` - Recalculate rankings
- `getLeaderboard(limit)` - Get top players
- `getPlayerStats(username)` - Get player data
- `saveAnalyticsEvent(eventData)` - Save event
- `getGameStatistics(days)` - Analytics queries

### KafkaProducer (kafka/KafkaProducer.js)
- Connects to Kafka cluster
- Sends game events
- Handles failures gracefully

**Events Sent:**
- `GAME_STARTED` - When match begins
- `MOVE_PLAYED` - When disc placed
- `GAME_ENDED` - When game finishes
- `PLAYER_DISCONNECTED` - When player leaves

### KafkaConsumer (kafka/KafkaConsumer.js)
- Consumes events from Kafka
- Stores events in MongoDB
- Generates analytics

**Analytics Calculated:**
- Average game duration
- Most frequent winners
- Games per hour/day
- Result distribution

### Socket.IO Handlers (sockets/gameHandlers.js)
- `onJoinQueue` - Player enters queue
- `onBotSpawned` - Bot opponent created
- `onMakeMove` - Player makes move
- `onDisconnect` - Handle disconnect
- `onReconnect` - Restore connection
- `onGetLeaderboard` - Fetch rankings
- `onGetPlayerStats` - Fetch player data

## API Endpoints

```
GET /health
├─ Status: OK
├─ Waiting players count
└─ Active sessions count

GET /api/leaderboard?limit=20
└─ Top players sorted by wins

GET /api/player/:username
└─ Player statistics and history

GET /api/analytics
└─ Kafka-based game analytics
```

## Game Logic Flow

```
1. Client: emit 'joinQueue'
   → Server: Add to waiting queue
   → Start 10s bot timeout

2. (Option A) Another player joins within 10s
   → Server: Pair players, cancel timeout
   → Create game session
   → Both clients: emit 'gameMatched'

3. (Option B) 10s timeout reached, no opponent
   → Server: Create game with bot
   → Client: emit 'botSpawned'
   → emit 'gameMatched' with bot

4. Game starts, turn-based play
   Client: emit 'makeMove' {sessionId, column}
   → Server: Validate move
   → Execute move in GameEngine
   → Check win/draw
   → If vs bot: BotEngine.makeMove()
   → All clients: emit 'gameState'
   → If game over: emit 'gameEnded'

5. Disconnect handling
   Client disconnects
   → Server: Mark player disconnected
   → Send 'playerDisconnected' event
   → Start 30s reconnect timer

6. Reconnection
   Client: emit 'reconnect' {username, sessionId}
   → Server: Validate and restore connection
   → Send 'playerReconnected' with game state
   → Or 'forfeit' if 30s expired

7. Game completion
   → DatabaseService.saveGame()
   → Update player stats
   → Recalculate leaderboard
   → Send Kafka events
```

## Monitoring & Debugging

### Check Server Status
```bash
curl http://localhost:3001/health
```

### MongoDB Queries
```javascript
// Check games
db.games.find({})

// Check players
db.players.find({})

// Check leaderboard
db.leaderboards.find({}).sort({rank: 1})

// Check events
db.analyticsevents.find({}).limit(10)
```

### Socket.IO Debugging
```javascript
// Server console logs:
[SOCKET] Player joining: username (socketId)
[SOCKET] Players matched: Alice vs Bob
[SOCKET] Player waiting: Charlie
[SOCKET] Bot spawned for: David
[SOCKET] Player disconnected: Eve (socketId)
[SOCKET] Player reconnected: Frank
[SOCKET] Game ended: sessionId, Result: win/draw/forfeit
```

### Kafka Debugging
```bash
# List topics
kafka-topics --list --bootstrap-server localhost:9092

# Read events
kafka-console-consumer --topic connect4-events --from-beginning --bootstrap-server localhost:9092
```

## Error Handling

### Common Issues

**"MongoDB connection failed"**
- Ensure MongoDB is running on localhost:27017
- Check MONGODB_URI in .env
- Verify network connectivity

**"Kafka Producer connection failed"**
- Kafka is optional, system works without it
- Ensure Kafka is running on localhost:9092
- Check KAFKA_BROKERS in .env

**"Invalid column"**
- Column must be 0-6
- Validate on client before sending

**"Column is full"**
- Column is already filled
- Valid moves are shown in game state

**"Not your turn"**
- Player tried to move out of turn
- Check currentPlayer in gameState

## Performance Tips

1. **Database Indexing**
   - Sessions indexed on player usernames
   - Games indexed on sessionId
   - Events indexed on timestamp

2. **Memory Management**
   - Old sessions cleaned up periodically
   - Game sessions removed after completion
   - Matchmaking timeouts cleared

3. **Kafka Optimization**
   - Producer sends non-blocking
   - Consumer processes async
   - Batch event writes when possible

4. **Socket.IO Optimization**
   - Use rooms for game broadcasting
   - Only send updates when state changes
   - Compress messages when large

## Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Use MongoDB Atlas or managed service
- [ ] Use Kafka cluster (not local)
- [ ] Enable HTTPS/WSS
- [ ] Add authentication/JWT tokens
- [ ] Enable rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure CORS properly
- [ ] Add input validation
- [ ] Set up database backups
- [ ] Use environment secrets manager
- [ ] Load balance if multiple servers
- [ ] Cache leaderboard (Redis)
- [ ] Add request logging
- [ ] Monitor Kafka lag

## Deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment for Docker
- MONGODB_URI=mongodb://mongo:27017/connect4
- KAFKA_BROKERS=kafka:9092

## Testing

### Unit Tests (Recommended)
```javascript
// Test GameEngine
- Test dropPiece for valid/invalid moves
- Test win detection all directions
- Test draw detection
- Test evaluateMove scoring

// Test BotEngine
- Test getBestMove priorities
- Test winning move detection
- Test blocking moves

// Test MatchmakingService
- Test player queueing
- Test pairing logic
- Test bot spawning
- Test reconnection window
```

### Integration Tests
- Socket.IO connection
- Full game flow (move → win)
- Disconnect/reconnect
- Multiplayer synchronization
- Bot behavior

## Troubleshooting

**Game state not syncing between players**
- Check Socket.IO rooms are correct
- Verify game broadcasts reach both clients
- Check network connectivity

**Bot making invalid moves**
- Validate BotEngine.getBestMove() logic
- Check getValidMoves() in GameEngine
- Log bot decisions for debugging

**Players not finding each other**
- Check 10-second timeout duration
- Verify matchmaking queue logic
- Check socket IDs are correct

**Stats not updating**
- Check DatabaseService.saveGame() called
- Verify MongoDB connection
- Check updatePlayerStats() logic

---

For more details, see main [README.md](../README.md)
