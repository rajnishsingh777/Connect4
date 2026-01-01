# Architecture Documentation - Connect Four

## System Overview

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTP/WebSocket
       │ Socket.IO
       ▼
┌──────────────────────────────────────┐
│      Node.js + Express Server        │
│   (Real-time Game Logic)             │
├──────────────────────────────────────┤
│  Socket.IO Handler                   │
│  - Connection Management             │
│  - Game Events                       │
│  - Broadcasting                      │
├──────────────────────────────────────┤
│  Game Engine                         │
│  - Board State                       │
│  - Move Validation                   │
│  - Win Detection                     │
├──────────────────────────────────────┤
│  Matchmaking Service                 │
│  - Queue Management                  │
│  - Player Pairing                    │
│  - Session Creation                  │
├──────────────────────────────────────┤
│  Bot Engine                          │
│  - Strategic Decision Making         │
│  - Move Evaluation                   │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
┌────────┐  ┌────────┐  ┌────────┐
│MongoDB │  │ Kafka  │  │ Redis  │
│        │  │        │  │(Cache) │
│ Games  │  │Events  │  │(Optional)
│Players │  │        │  │
│Stats   │  │Producer│  │
└────────┘  │Consumer│  │
            └────────┘  └────────┘
```

## Core Components

### 1. GameEngine (engines/GameEngine.js)

**Purpose**: Pure game logic without external dependencies

**Data Structure**:
```javascript
class GameEngine {
  board: number[][]        // 6x7 grid (0=empty, 1=player1, 2=player2)
  currentPlayer: number    // 1 or 2
  moveHistory: object[]    // [{row, col, player}, ...]
  gameOver: boolean
  winner: number | null
  isDraw: boolean
}
```

**Key Methods**:
- `dropPiece(col)` - O(1) place piece, returns result
- `checkWin(row, col, player)` - O(1) check 4 directions
- `countConsecutive(row, col, dr, dc, player)` - Count pieces
- `isBoardFull()` - O(7) check draw
- `getValidMoves()` - O(7) return available columns
- `evaluateMove(col, player)` - Score move for bot

**Win Detection**:
```
4 directions checked:
1. Horizontal: (0, 1)
2. Vertical: (1, 0)
3. Diagonal: (1, 1)
4. Diagonal: (1, -1)

For each direction, count both ways from piece location
```

### 2. BotEngine (engines/BotEngine.js)

**Purpose**: Intelligent AI opponent

**Strategy (Priority Order)**:
```
1. Winning Move (10,000 points)
   - Check if bot can win immediately
   - Return first winning move found

2. Blocking Move (8,000 points)
   - Check if opponent can win
   - Block that column

3. Position Scoring:
   - Center preference: ±300 points based on distance
   - Adjacent pieces: ±50 points each
   - Column height: Prefers mid-height positions

4. Best Move:
   - Highest total score wins
   - No randomness, deterministic
```

**Key Methods**:
- `getBestMove()` - Evaluate all valid moves, return best
- `makeMove()` - Execute move in GameEngine

**Complexity**: O(7 * n) where n = board evaluation depth

### 3. MatchmakingService (services/MatchmakingService.js)

**Purpose**: Queue management and session creation

**Data Structures**:
```javascript
waitingPlayers: Map<socketId, {socketId, username, timestamp}>
activeSessions: Map<sessionId, GameSession>
matchmakingTimeouts: Map<socketId, timeoutId>
```

**Game Session Structure**:
```javascript
{
  sessionId: string,
  player1: {socketId, username, connected, disconnectTime},
  player2: {socketId, username, isBot?, connected, disconnectTime},
  isVsBot: boolean,
  gameEngine: GameEngine,
  botEngine: BotEngine | null,
  startTime: timestamp,
  endTime: timestamp,
  result: 'win' | 'draw' | 'forfeit',
  winner: string | null
}
```

**Workflow**:
```
1. Player joins queue
   → Add to waitingPlayers Map
   → Set 10-second timeout for bot spawn

2. Try pair with existing player
   → O(n) scan of waitingPlayers
   → If found: create session, clear timeouts
   → If not: wait for timeout

3. 10 seconds pass without match
   → Remove from queue
   → Create game with bot
   → Player notified via Socket.IO

4. During game: markDisconnected(socketId)
   → Mark player as disconnected
   → Start 30-second reconnect timer
   → Continue game if both connected

5. Reconnect attempt: reconnect(socketId, username, sessionId)
   → Validate within 30-second window
   → Restore socketId
   → Resume game

6. If 30 seconds expired: forfeitGame()
   → End game (opponent wins)
   → Save to database
```

### 4. DatabaseService (services/DatabaseService.js)

**Purpose**: MongoDB persistence layer

**Collections**:

**Games**:
- sessionId (indexed, unique)
- player1, player2 (usernames)
- winner, result, duration
- moveCount, board snapshot
- timestamps

**Players**:
- username (indexed, unique)
- wins, losses, draws, forfeits
- totalGames, winRate, totalDuration
- averageGameDuration
- lastGameAt, createdAt, updatedAt

**Leaderboard**:
- Cached copy of top 100 players
- Rank, username, stats
- Regenerated after each game

**AnalyticsEvents**:
- Event type (GAME_STARTED, MOVE_PLAYED, etc)
- sessionId, players, details
- timestamp (indexed)

**Operations**:
```javascript
saveGame(session)
  → Insert game record
  → Update both players
  → Recalculate leaderboard

updatePlayerStats(p1, p2, result, winner, duration)
  → Increment wins/losses/draws
  → Add to totalGames
  → Update lastGameAt

updateLeaderboard()
  → Clear leaderboard
  → Get top 100 by wins
  → Rank and insert
```

### 5. KafkaProducer (kafka/KafkaProducer.js)

**Purpose**: Event streaming to Kafka

**Events Emitted**:
```javascript
GAME_STARTED {
  sessionId, player1, player2, isVsBot, timestamp
}

MOVE_PLAYED {
  sessionId, player1, player2, moveColumn, moveRow,
  moveMadeBy, timestamp
}

GAME_ENDED {
  sessionId, player1, player2, gameResult, winner,
  gameDuration, moveCount, timestamp
}

PLAYER_DISCONNECTED {
  sessionId, player1, player2, disconnectedPlayer, timestamp
}
```

**Implementation**:
```javascript
async sendEvent(event)
  → JSON.stringify(event)
  → Send to 'connect4-events' topic
  → Key: sessionId (for ordering)
  → Non-blocking (fire and forget)
```

### 6. KafkaConsumer (kafka/KafkaConsumer.js)

**Purpose**: Event consumption and analytics

**Processing**:
```javascript
For each event:
  1. Save to AnalyticsEvents collection
  2. If GAME_ENDED:
     - Update game stats
     - Calculate winner frequency
     - Track game duration trends

Analytics Queries:
  → Average game duration (7 days)
  → Most frequent winners (top 10)
  → Games per hour (last 24 hours)
  → Result distribution (win/draw/forfeit)
```

### 7. Socket.IO Handlers (sockets/gameHandlers.js)

**Purpose**: Real-time game communication

**Events Handled**:

**Client → Server**:
```javascript
'joinQueue'
  → Validate username
  → Add to matchmaking queue
  → Or pair immediately
  → Or spawn bot after 10s

'makeMove'
  → Find session
  → Validate move
  → Execute in GameEngine
  → Broadcast gameState
  → If bot game: bot move
  → Check game over

'reconnect'
  → Validate username + sessionId
  → Restore connection
  → Or forfeit if timeout expired

'getLeaderboard'
  → Fetch from database
  → Emit to client

'getPlayerStats'
  → Fetch from database
  → Emit to client
```

**Server → Client**:
```javascript
'waitingForOpponent'
  → Show waiting screen

'gameMatched'
  → Send initial gameState
  → Show board

'gameState'
  → Board, currentPlayer, validMoves
  → After each move

'gameEnded'
  → Result, winner, duration
  → Show end screen

'playerDisconnected'
  → Show alert
  → Start reconnect timer

'playerReconnected'
  → Resume game

'error'
  → Show error message
```

## Data Flow Diagrams

### Game Start Flow
```
Client: 'joinQueue' {username}
  ↓
Server: Check username
  ↓
Server: Add to waitingPlayers
  ↓
Server: Try to pair with existing player
  ├─ Found → Create session
  │          Emit 'gameMatched' to both
  │
  └─ Not found → Set 10s timeout
                 Emit 'waitingForOpponent'
                 
(At 10s timeout)
  ├─ Player joins in time → Pair and emit 'gameMatched'
  └─ No player → Spawn bot
                 Emit 'botSpawned' + 'gameMatched'
```

### Move Flow
```
Client: 'makeMove' {sessionId, column}
  ↓
Server: Find session
  ↓
Server: Validate (is it your turn? column valid?)
  ↓
Server: gameEngine.dropPiece(column)
  ├─ Success
  │   ├─ Check win → gameOver = true
  │   ├─ Check draw → gameOver = true
  │   └─ Switch player
  │
  └─ Failure → Return error
  
Server: Send Kafka 'MOVE_PLAYED' event
  ↓
Server: Broadcast 'gameState' to all in room
  ↓
If game over:
  → Send Kafka 'GAME_ENDED'
  → DatabaseService.saveGame()
  → Broadcast 'gameEnded'
  
Else if vs bot:
  → BotEngine.makeMove()
  → Send Kafka 'MOVE_PLAYED'
  → Broadcast 'gameState'
  → Check bot won
```

### Disconnect/Reconnect Flow
```
Player A disconnects
  ↓
Server: 'disconnect' event
  ↓
Server: markDisconnected(socketId)
  → Mark player.connected = false
  → Start 30s reconnect timer
  → Send Kafka 'PLAYER_DISCONNECTED'
  
Server: Broadcast 'playerDisconnected' to opponent
  ↓
(30 second window)
  ├─ Player reconnects
  │   → Client: 'reconnect' {username, sessionId}
  │   → Server: Validate credentials
  │   → Update socketId in session
  │   → Clear timer
  │   → Broadcast 'playerReconnected'
  │   → Game continues
  │
  └─ 30s expires
      → Server: forfeitGame(sessionId)
      → Result: opponent wins
      → DatabaseService.saveGame()
      → Broadcast 'gameEnded'
```

## Performance Characteristics

### GameEngine Operations
```
Operation              Time Complexity
─────────────────────────────────────
dropPiece(col)        O(6) = O(1)
checkWin(row, col)    O(6) = O(1)
getValidMoves()       O(7) = O(1)
evaluateMove(col)     O(7*6) = O(1)
isBoardFull()         O(7) = O(1)
```

### MatchmakingService Operations
```
Operation              Time Complexity
─────────────────────────────────────
joinQueue()           O(n) where n = waiting players
tryPairPlayers()      O(n)
getSessionById()      O(1) - Map lookup
getSessionByPlayerId()O(m) where m = active sessions
```

### BotEngine Operations
```
Operation              Time Complexity
─────────────────────────────────────
getBestMove()         O(7 * evaluation)
makeMove()            O(7 * evaluation)

For each of 7 columns:
  → Simulate drop: O(1)
  → Check win: O(1)
  → Score move: O(1)
Total: O(7) ≈ O(1)
```

### Database Operations
```
Operation              Strategy
─────────────────────────────────────
saveGame()            Insert + 2 updates
updatePlayerStats()   Batch update
updateLeaderboard()   Clear + aggregate
getLeaderboard()      Indexed sort (top 100)
getPlayerStats()      Indexed lookup
```

## Scalability Considerations

### Current Design (Single Server)
- ✅ In-memory session storage - fast
- ✅ Real-time communication via WebSocket
- ✅ MongoDB for persistence
- ✅ Kafka for event distribution
- ❌ Single point of failure

### For Production Scaling

**Horizontal Scaling**:
1. Load balancer (nginx/HAProxy)
2. Multiple Node.js servers
3. Session store (Redis) instead of in-memory
4. Database replicas

**Example Architecture**:
```
┌─────────────────────────┐
│   Load Balancer         │
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
  ┌───┐   ┌───┐   ┌───┐
  │API│   │API│   │API│  (Multiple instances)
  └─┬─┘   └─┬─┘   └─┬─┘
    │      │      │
    └──────┼──────┘
           ▼
        ┌─────┐
        │Redis│  (Session store)
        └─────┘
           │
        ┌──────────┐
        │ MongoDB  │  (Replicated)
        └──────────┘
           │
        ┌─────────────┐
        │   Kafka     │  (Distributed)
        │ Cluster     │
        └─────────────┘
```

## Security Implementation

### Current Implementation (Development)
- No authentication required
- Username validation only
- CORS enabled for localhost

### Recommended Production Additions
```javascript
// Authentication
- JWT tokens
- User accounts with passwords
- Email verification

// Authorization
- Session validation
- Player ownership checks
- Admin roles

// Communication
- HTTPS only
- WSS (Secure WebSocket)
- Input sanitization
- Rate limiting

// Database
- MongoDB authentication
- Encrypted connections
- Backup procedures

// Kafka
- SASL authentication
- SSL/TLS encryption
- Topic ACLs
```

## Error Handling

### Game Logic Errors
```javascript
if (column < 0 || column >= 7)
  → Return { success: false, error: 'Invalid column' }

if (board[0][col] !== EMPTY)
  → Return { success: false, error: 'Column is full' }

if (gameOver)
  → Return { success: false, error: 'Game already over' }
```

### Matchmaking Errors
```javascript
if (username in use)
  → Return { error: 'Username already in game' }

if (player not found)
  → Emit 'error' event

if (reconnect timeout expired)
  → Forfeit game to opponent
```

### Socket.IO Errors
```javascript
on('error', (data) => {
  socket.emit('error', {message: data.message})
})

All recoverable errors → show alert, let user retry
All fatal errors → disconnect and ask user to rejoin
```

## Testing Strategy

### Unit Tests (GameEngine)
```javascript
describe('GameEngine', () => {
  test('dropPiece validates column')
  test('checkWin detects all 4 directions')
  test('isBoardFull detects draw')
  test('evaluateMove scores moves correctly')
})
```

### Integration Tests (BotEngine)
```javascript
describe('BotEngine', () => {
  test('finds winning move')
  test('blocks opponent win')
  test('prefers center columns')
  test('never makes random moves')
})
```

### Socket.IO Tests
```javascript
describe('Socket.IO', () => {
  test('two players matched within 10s')
  test('bot spawned after 10s')
  test('move syncs between players')
  test('reconnect restores game state')
})
```

### End-to-End Tests
```javascript
describe('Game Flow', () => {
  test('complete game: start → moves → win')
  test('multiplayer: two browsers sync')
  test('bot game: bot plays intelligently')
  test('reconnection: restore within 30s')
})
```

---

This architecture ensures:
- ✅ Real-time responsiveness
- ✅ Fair gameplay logic
- ✅ Intelligent bot opponent
- ✅ Persistence and analytics
- ✅ Scalable design
- ✅ Clean code separation
