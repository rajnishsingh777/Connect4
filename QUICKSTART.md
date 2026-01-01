# Quick Start Guide - Connect Four

## Prerequisites
- Node.js 14+ installed
- npm installed
- (Optional) Docker & Docker Compose for easy setup

## Option 1: Quick Setup (With Docker)

### 1. Start Services
```bash
cd connect4
docker-compose up -d
```

This starts:
- MongoDB on localhost:27017
- Kafka on localhost:9092
- Backend server on localhost:3001

### 2. Start Frontend (separate terminal)
```bash
cd frontend
npm install
npm start
```

Frontend opens at: http://localhost:3000

### 3. Play!
- Open http://localhost:3000 in your browser
- Enter a username
- Wait for opponent or bot will join in 10 seconds
- Play and enjoy!

---

## Option 2: Manual Setup (Without Docker)

### Step 1: MongoDB
**Windows:**
```bash
# Download and install from https://www.mongodb.com/try/download/community
# Start MongoDB
mongod
```

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongod
```

### Step 2: Kafka (Optional - for analytics)
Download from: https://kafka.apache.org/downloads

```bash
# Extract and navigate
cd kafka_2.13-3.x.x

# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties

# In another terminal, start Kafka
bin/kafka-server-start.sh config/server.properties
```

### Step 3: Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend starts on: http://localhost:3001

### Step 4: Frontend (new terminal)
```bash
cd frontend
npm install
npm start
```

Frontend opens on: http://localhost:3000

---

## Testing the Setup

### 1. Single Player (vs Bot)
1. Go to http://localhost:3000
2. Enter username "Player1"
3. Click "Find Match"
4. Wait 10 seconds
5. Bot joins automatically
6. Play and win!

### 2. Two Players
1. Open http://localhost:3000 in Browser A
2. Enter username "Alice"
3. Click "Find Match"
4. Open http://localhost:3000 in Browser B
5. Enter username "Bob"
6. Click "Find Match" within 10 seconds
7. Game starts immediately
8. Take turns playing

### 3. Leaderboard
1. After playing some games
2. Click "View Leaderboard"
3. See top players ranked

### 4. Player Stats
1. Click "My Stats" to see personal statistics

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running: `mongod` or `docker-compose up`
- Check connection string in `.env`

### "Cannot connect to Kafka"
- Kafka is optional - system works without it
- Or start Kafka service if you want analytics

### "Socket.IO connection failed"
- Ensure backend is running: `npm run dev` in backend/
- Check if port 3001 is available
- Check CORS settings in server.js

### "Frontend won't load"
- Ensure backend is running first
- Frontend starts on http://localhost:3000
- Check browser console for errors

### "Game won't start"
- Wait 10 seconds for bot (if single player)
- Or have second browser window ready (2 players)
- Check Socket.IO connection in browser DevTools

---

## File Structure

```
connect4/
├── README.md                 # Main documentation
├── .gitignore              # Git ignore rules
├── docker-compose.yml      # Docker services
│
├── backend/
│   ├── README.md           # Backend docs
│   ├── package.json        # Dependencies
│   ├── Dockerfile          # Docker config
│   ├── .env.example        # Example config
│   └── src/
│       ├── server.js       # Main server
│       ├── engines/        # Game & Bot logic
│       ├── models/         # MongoDB schemas
│       ├── services/       # Business logic
│       ├── kafka/          # Event streaming
│       └── sockets/        # WebSocket handlers
│
└── frontend/
    ├── README.md           # Frontend docs
    ├── package.json        # Dependencies
    └── src/
        ├── App.js          # Main component
        ├── components/     # React components
        └── index.js        # React entry
```

---

## API Overview

### Socket.IO (Real-time)
```javascript
// Client sends
socket.emit('joinQueue', { username })
socket.emit('makeMove', { sessionId, column })
socket.emit('getLeaderboard')

// Server sends
socket.on('gameMatched', {...})
socket.on('gameState', {...})
socket.on('gameEnded', {...})
```

### REST API
```
GET /health                    # Server status
GET /api/leaderboard          # Top 20 players
GET /api/player/:username     # Player stats
GET /api/analytics            # Game analytics
```

---

## Game Rules

- **Board**: 7 columns, 6 rows
- **Goal**: Get 4 pieces in a row (any direction)
- **Turn**: Drop 1 disc per turn
- **Drop**: Piece falls to lowest position
- **Win**: 4 horizontal, vertical, or diagonal
- **Draw**: Board full with no winner
- **Reconnect**: 30 second window if disconnected

---

## Bot Strategy

Bot intelligently chooses moves:
1. **Win** - If it can win immediately (score: 10,000)
2. **Block** - If opponent can win (score: 8,000)
3. **Center** - Prefer columns 2-4 (score: +300)
4. **Best Move** - Highest scoring valid move

Bot never plays randomly - always strategic!

---

## Common Commands

### Backend
```bash
npm install           # Install dependencies
npm run dev          # Start with auto-reload
npm start            # Start server
```

### Frontend
```bash
npm install          # Install dependencies
npm start            # Start dev server
npm run build        # Create production build
```

### Docker
```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f        # View logs
docker-compose ps             # List services
```

### MongoDB
```bash
# Connect to MongoDB shell
mongo
use connect4
db.games.find({})
db.players.find({})
```

### Kafka
```bash
# List topics
kafka-topics --list --bootstrap-server localhost:9092

# View events
kafka-console-consumer --topic connect4-events --bootstrap-server localhost:9092 --from-beginning
```

---

## Next Steps

1. ✅ Setup complete!
2. Open http://localhost:3000
3. Enter a username and start playing
4. Invite a friend to play against
5. Check leaderboard for rankings
6. Play multiple games to climb ranks

---

## Support

For detailed documentation:
- Backend: See [backend/README.md](backend/README.md)
- Frontend: See [frontend/README.md](frontend/README.md)
- Full API: See main [README.md](README.md)

---

**Enjoy playing Connect Four! 🎮**
