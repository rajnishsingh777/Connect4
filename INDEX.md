# Connect Four - Project Index & Quick Reference

## 📚 Documentation Index

Start with these in order:

1. **[README.md](README.md)** ⭐ START HERE
   - Complete feature overview
   - Architecture diagram
   - Game rules & bot strategy
   - API documentation
   - Socket.IO event reference
   - MongoDB schema definitions

2. **[QUICKSTART.md](QUICKSTART.md)** 🚀
   - 3-step setup with Docker
   - Manual setup instructions
   - Testing scenarios
   - Troubleshooting guide

3. **[ARCHITECTURE.md](ARCHITECTURE.md)** 🏗️
   - System design overview
   - Component deep dive
   - Data flow diagrams
   - Performance characteristics
   - Scalability notes

4. **[DEPLOYMENT.md](DEPLOYMENT.md)** 📦
   - 5 deployment options (Docker, Heroku, AWS, etc.)
   - Environment configuration
   - Monitoring & logging
   - Security hardening

5. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** ✅
   - What was built
   - File statistics
   - Getting started in 3 steps

6. **[FILE_MANIFEST.md](FILE_MANIFEST.md)** 📋
   - Complete file listing
   - Line counts
   - Feature checklist

## 🎮 Quick Start

### Docker Setup (Recommended)
```bash
cd connect4
docker-compose up -d
cd frontend && npm install && npm start
# Open http://localhost:3000
```

### Manual Setup
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm start
```

## 📁 Project Structure Reference

```
connect4/                          # Root directory
├── README.md                       # Main documentation
├── QUICKSTART.md                   # Setup guide
├── ARCHITECTURE.md                 # Technical design
├── DEPLOYMENT.md                   # Deployment options
├── IMPLEMENTATION_SUMMARY.md       # Overview
├── FILE_MANIFEST.md                # File listing
├── .gitignore                      # Git ignore
├── docker-compose.yml              # Docker services
│
├── backend/                        # Node.js API
│   ├── README.md                   # Backend docs
│   ├── package.json                # Dependencies
│   ├── Dockerfile                  # Container config
│   ├── .env.example                # Config template
│   └── src/
│       ├── server.js               # Main server
│       ├── engines/                # Game logic
│       │   ├── GameEngine.js       # 7x6 board
│       │   └── BotEngine.js        # AI opponent
│       ├── models/
│       │   └── schemas.js          # MongoDB
│       ├── services/               # Business logic
│       │   ├── MatchmakingService.js
│       │   └── DatabaseService.js
│       ├── kafka/                  # Event streaming
│       │   ├── KafkaProducer.js
│       │   └── KafkaConsumer.js
│       └── sockets/                # Real-time
│           └── gameHandlers.js
│
└── frontend/                       # React UI
    ├── README.md                   # Frontend docs
    ├── package.json                # Dependencies
    ├── public/
    │   └── index.html              # HTML template
    └── src/
        ├── App.js                  # Main component
        ├── App.css                 # Styles
        ├── index.js                # Entry point
        └── components/             # UI components
            ├── GameBoard.js
            ├── UsernameInput.js
            ├── GameStatus.js
            ├── Leaderboard.js
            ├── PlayerStats.js
            └── *.css               # Component styles
```

## 🔑 Key Components Quick Links

### Backend

**Game Logic**
- [GameEngine.js](backend/src/engines/GameEngine.js) - Board, moves, win detection
- [BotEngine.js](backend/src/engines/BotEngine.js) - Intelligent AI strategy

**Services**
- [MatchmakingService.js](backend/src/services/MatchmakingService.js) - Queue & pairing
- [DatabaseService.js](backend/src/services/DatabaseService.js) - Persistence

**Real-time**
- [gameHandlers.js](backend/src/sockets/gameHandlers.js) - Socket.IO events
- [server.js](backend/src/server.js) - Express setup

**Data & Events**
- [schemas.js](backend/src/models/schemas.js) - MongoDB collections
- [KafkaProducer.js](backend/src/kafka/KafkaProducer.js) - Event sender
- [KafkaConsumer.js](backend/src/kafka/KafkaConsumer.js) - Event receiver

### Frontend

**Main**
- [App.js](frontend/src/App.js) - Main component & game logic
- [App.css](frontend/src/App.css) - Main styling

**Components**
- [GameBoard.js](frontend/src/components/GameBoard.js) - 7x6 board UI
- [UsernameInput.js](frontend/src/components/UsernameInput.js) - Username form
- [GameStatus.js](frontend/src/components/GameStatus.js) - Turn indicator
- [Leaderboard.js](frontend/src/components/Leaderboard.js) - Rankings
- [PlayerStats.js](frontend/src/components/PlayerStats.js) - Statistics

## 🎯 Common Tasks

### Run Locally
```bash
docker-compose up -d      # Start services
cd frontend && npm start   # Start React app
```

### Build for Production
```bash
cd frontend && npm run build
# Creates `build/` folder ready for deployment
```

### View Database
```bash
# Connect to MongoDB (when running locally)
mongo
use connect4
db.games.find({}).limit(5)
db.players.find({})
```

### Monitor Logs
```bash
# Backend logs
pm2 logs connect4

# Docker logs
docker-compose logs -f backend
```

### Kafka Events
```bash
# View events in Kafka
kafka-console-consumer --topic connect4-events \
  --bootstrap-server localhost:9092 --from-beginning
```

## 📊 Game Concepts

### Board State
- 6 rows × 7 columns
- 0 = empty, 1 = Player 1 (Red), 2 = Player 2 (Yellow)

### Win Conditions
- 4 in a row: horizontal, vertical, or diagonal
- Draw: board full with no winner

### Bot Strategy (Priority Order)
1. **Win** - If it can win immediately (10,000 points)
2. **Block** - If opponent can win (8,000 points)
3. **Center** - Prefer center columns (±300 points)
4. **Score** - Choose highest scoring move

### Game Flow
1. Player joins queue
2. Wait 10 seconds for opponent or bot spawns
3. Game starts - alternating turns
4. Drop pieces and check for win
5. Game ends and saves to database
6. Leaderboard updates

## 🔌 API Reference

### WebSocket Events

**Emit from Client:**
```javascript
socket.emit('joinQueue', { username })
socket.emit('makeMove', { sessionId, column })
socket.emit('reconnect', { username, sessionId })
socket.emit('getLeaderboard')
socket.emit('getPlayerStats', { username })
```

**Listen from Server:**
```javascript
socket.on('gameMatched', { sessionId, player1, player2, ... })
socket.on('gameState', { board, currentPlayer, ... })
socket.on('gameEnded', { result, winner, duration })
socket.on('playerDisconnected', { player, message })
socket.on('playerReconnected', { player, gameState })
```

### REST Endpoints
```
GET /health                    Server status
GET /api/leaderboard          Top 20 players
GET /api/player/:username     Player stats
GET /api/analytics            Game analytics
```

## 🔧 Configuration

### Environment Variables
```env
PORT=3001                              # Backend port
MONGODB_URI=mongodb://localhost:27017  # Database
KAFKA_BROKERS=localhost:9092           # Event streaming
NODE_ENV=development                   # Environment
```

### Services (Docker Compose)
- **MongoDB**: localhost:27017
- **Kafka**: localhost:9092
- **Backend**: localhost:3001
- **Frontend**: localhost:3000

## 🚀 Deployment Quick Links

### Local
- [Docker Compose](QUICKSTART.md#option-1-quick-setup-with-docker)
- [Manual Setup](QUICKSTART.md#option-2-manual-setup-without-docker)

### Cloud
- [Heroku](DEPLOYMENT.md#option-2-heroku-deployment)
- [AWS](DEPLOYMENT.md#option-3-aws-deployment)
- [DigitalOcean](DEPLOYMENT.md#option-4-digitalocean-deployment)
- [Docker Swarm](DEPLOYMENT.md#option-5-docker-swarm--kubernetes)
- [Kubernetes](DEPLOYMENT.md#option-5-docker-swarm--kubernetes)

## 📞 Support & Troubleshooting

**Backend won't start?** → See [Backend README](backend/README.md#troubleshooting)
**Frontend won't load?** → See [Frontend README](frontend/README.md#common-issues)
**MongoDB error?** → See [Deployment Guide](DEPLOYMENT.md#mongodb-backup)
**Socket.IO issues?** → Check browser console & [Backend README](backend/README.md#socket-io-debugging)

## 📈 Code Statistics

```
Backend Code:    ~1,800 lines
Frontend Code:   ~1,500 lines
Documentation:   ~3,900 lines
Total:           ~7,200 lines
```

## ✨ What Makes This Special

✅ **No Random Bot Moves** - Deterministic AI using strategic scoring
✅ **Production Code** - Error handling, logging, config management
✅ **Real-time** - WebSocket with Socket.IO for instant updates
✅ **Scalable** - Kafka event streaming, MongoDB persistence
✅ **Well-Documented** - 4,000+ lines of comprehensive guides
✅ **Easy Deploy** - Docker, multiple cloud options
✅ **Complete** - Frontend + Backend + Database + Analytics

## 🎓 Learning Resources

**New to Node.js?** → Start with [server.js](backend/src/server.js)
**New to React?** → Start with [App.js](frontend/src/App.js)
**New to MongoDB?** → Check [schemas.js](backend/src/models/schemas.js)
**New to Socket.IO?** → See [gameHandlers.js](backend/src/sockets/gameHandlers.js)
**New to Kafka?** → Read [KafkaProducer.js](backend/src/kafka/KafkaProducer.js)

---

**Ready to play? Start with [QUICKSTART.md](QUICKSTART.md)! 🎮**
