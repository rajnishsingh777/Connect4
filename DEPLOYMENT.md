# Deployment Guide - Connect Four

## Deployment Options

### Option 1: Docker Compose (Recommended for Testing)

**Setup**:
```bash
docker-compose up -d
```

Services start automatically:
- MongoDB: localhost:27017
- Kafka: localhost:9092
- Backend: localhost:3001

**Stop**:
```bash
docker-compose down
```

---

### Option 2: Heroku Deployment

#### Backend Deployment

**1. Prepare Heroku App**:
```bash
heroku login
heroku create your-connect4-app
heroku addons:create mongolab:sandbox
heroku addons:create kafka-on-heroku
```

**2. Set Environment Variables**:
```bash
heroku config:set MONGODB_URI=mongodb://...
heroku config:set KAFKA_BROKERS=kafka://...
heroku config:set NODE_ENV=production
```

**3. Deploy**:
```bash
cd backend
git subtree push --prefix backend heroku main
```

#### Frontend Deployment

**1. Build Static Files**:
```bash
cd frontend
npm run build
```

**2. Deploy to Vercel/Netlify**:
```bash
npm install -g vercel
vercel --prod --name connect4-frontend
```

**3. Set Environment Variable**:
```
REACT_APP_SOCKET_URL=https://your-connect4-app.herokuapp.com
```

---

### Option 3: AWS Deployment

#### Backend on EC2

**1. Launch EC2 Instance**:
- Ubuntu 20.04 LTS
- t2.micro or larger
- Open ports: 80, 443, 3001

**2. Install Dependencies**:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm mongodb
```

**3. Clone Repository**:
```bash
git clone <your-repo>
cd connect4/backend
npm install
```

**4. Setup PM2 for Auto-restart**:
```bash
npm install -g pm2
pm2 start npm --name "connect4" -- start
pm2 startup
pm2 save
```

**5. Setup Nginx Proxy**:
```bash
sudo apt install -y nginx

# Create /etc/nginx/sites-available/connect4
upstream backend {
  server localhost:3001;
}

server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/connect4 /etc/nginx/sites-enabled/
sudo nginx -s reload
```

**6. Setup HTTPS with Let's Encrypt**:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Frontend on S3 + CloudFront

**1. Build**:
```bash
cd frontend
npm run build
```

**2. Create S3 Bucket**:
```bash
aws s3 mb s3://connect4-frontend --region us-east-1
```

**3. Enable Static Website Hosting**:
```bash
aws s3 website s3://connect4-frontend --index-document index.html --error-document index.html
```

**4. Upload Files**:
```bash
aws s3 sync build/ s3://connect4-frontend --delete --cache-control max-age=31536000
```

**5. Create CloudFront Distribution**:
- Point to S3 bucket
- Enable HTTPS
- Set cache behaviors

---

### Option 4: DigitalOcean Deployment

#### Using DigitalOcean App Platform

**1. Connect GitHub Repository**:
- Create `.do/app.yaml`:

```yaml
name: connect4
services:
  - name: backend
    github:
      branch: main
      deploy_on_push: true
      repo: your-username/connect4
    source_dir: backend
    http_port: 3001
    run_command: npm start
    build_command: npm install
    envs:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        scope: RUN_AND_BUILD_TIME
        value: ${db.DATABASE_URL}
  
  - name: frontend
    github:
      branch: main
      deploy_on_push: true
      repo: your-username/connect4
    source_dir: frontend
    build_command: npm install && npm run build
    output_dir: build
    http_port: 3000

databases:
  - name: db
    engine: MONGODB
    version: "5"
```

**2. Deploy**:
```bash
doctl apps create --spec .do/app.yaml
```

---

### Option 5: Docker Swarm / Kubernetes

#### Docker Swarm

**1. Initialize Swarm**:
```bash
docker swarm init
```

**2. Create docker-compose.prod.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: your-registry/connect4-backend:latest
    ports:
      - "3001:3001"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/connect4
      KAFKA_BROKERS: kafka:29092
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    networks:
      - connect4

  mongodb:
    image: mongo:latest
    volumes:
      - db_data:/data/db
    deploy:
      placement:
        constraints: [node.role == manager]

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092
    deploy:
      placement:
        constraints: [node.role == manager]

volumes:
  db_data:

networks:
  connect4:
```

**3. Deploy**:
```bash
docker stack deploy -c docker-compose.prod.yml connect4
```

#### Kubernetes (Helm)

**1. Create Helm Chart Structure**:
```
connect4-helm/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── mongodb-statefulset.yaml
│   └── kafka-statefulset.yaml
```

**2. Deploy**:
```bash
helm install connect4 ./connect4-helm
```

---

## Environment Configuration

### Production .env Template

```env
# Server
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/connect4
MONGODB_POOL_SIZE=10

# Kafka
KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
KAFKA_SASL_MECHANISM=plain
KAFKA_SASL_USERNAME=user
KAFKA_SASL_PASSWORD=password
KAFKA_SECURITY_PROTOCOL=sasl_ssl

# CORS
CORS_ORIGIN=https://connect4.com,https://app.connect4.com

# Security
SESSION_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret

# Redis (optional caching)
REDIS_URL=redis://localhost:6379

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key
```

---

## Monitoring & Logging

### Application Monitoring

**PM2 Monitoring**:
```bash
pm2 monit
pm2 logs connect4
```

**Cloud Services**:
- **Datadog**: Application Performance Monitoring
- **New Relic**: Full stack observability
- **Sentry**: Error tracking

### Log Aggregation

**CloudWatch (AWS)**:
```javascript
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');

const logger = winston.createLogger({
  transports: [
    new WinstonCloudWatch({
      logGroupName: 'connect4',
      logStreamName: 'api'
    })
  ]
});
```

**ELK Stack (Elasticsearch, Logstash, Kibana)**:
```bash
# Run ELK in Docker
docker run -d -p 9200:9200 docker.elastic.co/elasticsearch/elasticsearch:7.10.0
docker run -d -p 5601:5601 docker.elastic.co/kibana/kibana:7.10.0
```

### Metrics & Alerts

**Prometheus + Grafana**:
```bash
# Add to server.js
const prometheus = require('prom-client');

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

---

## Database Management

### MongoDB Backup

**Automated Backup**:
```bash
# Daily backup script (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri "mongodb://localhost:27017/connect4" \
  --out "/backups/connect4_$DATE"

# Delete backups older than 30 days
find /backups -name "connect4_*" -mtime +30 -exec rm -rf {} \;

# Add to crontab
0 2 * * * /path/to/backup.sh
```

**Cloud Backup (Atlas)**:
```bash
# MongoDB Atlas handles automated backups
# Configure in MongoDB Atlas dashboard
```

### Database Optimization

```javascript
// Add indexes
db.games.createIndex({ sessionId: 1 })
db.games.createIndex({ createdAt: 1 })
db.players.createIndex({ username: 1 })
db.analyticsevents.createIndex({ timestamp: 1 })

// Monitor queries
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

---

## Performance Optimization

### Caching Strategy

**Redis Cache**:
```javascript
// Cache leaderboard (expires in 1 hour)
const leaderboard = await redis.get('leaderboard');
if (!leaderboard) {
  const data = await Leaderboard.find().limit(100);
  await redis.setex('leaderboard', 3600, JSON.stringify(data));
  return data;
}
```

### Database Optimization

**Connection Pooling**:
```javascript
mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000
});
```

**Query Optimization**:
```javascript
// Use lean() for read-only queries
const leaderboard = await Leaderboard.find()
  .lean()
  .limit(100)
  .sort({ rank: 1 });
```

---

## Security Hardening

### SSL/TLS Setup

**Self-signed Certificate** (Development):
```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365
```

**Let's Encrypt** (Production):
```bash
certbot certonly --standalone -d connect4.com
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### Input Validation

```javascript
const { body, validationResult } = require('express-validator');

app.post('/join', [
  body('username')
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process...
});
```

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://connect4.com', 'https://app.connect4.com'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

---

## Troubleshooting Deployment

### Backend Won't Start

```bash
# Check logs
pm2 logs connect4

# Check port
lsof -i :3001

# Check environment
printenv | grep MONGODB
```

### Slow Database Queries

```bash
# Enable slow query log
echo "
slow_ms = 100
profiling_level = 1
" >> mongod.conf

# Check profile
db.system.profile.find().limit(5).sort({ millis: -1 })
```

### High Memory Usage

```bash
# Check Node process
ps aux | grep node

# Enable heap snapshots
node --expose-gc --max-old-space-size=4096 app.js

# Analyze with clinic.js
npm install -g clinic
clinic doctor -- npm start
```

---

## Production Checklist

- [ ] HTTPS/WSS enabled
- [ ] Environment variables set
- [ ] Database authentication enabled
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Error logging enabled
- [ ] Monitoring/alerting setup
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Documentation updated
- [ ] CI/CD pipeline configured
- [ ] Disaster recovery plan
- [ ] Performance benchmarks met

---

## Rollback Strategy

### If Deployment Fails

**Docker**:
```bash
docker-compose down
docker-compose up -d  # Uses previous image
```

**PM2**:
```bash
pm2 kill
git revert HEAD
npm install
npm start
```

**Kubernetes**:
```bash
kubectl rollout history deployment/connect4
kubectl rollout undo deployment/connect4
```

---

## Continuous Deployment

### GitHub Actions

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker image
        run: |
          docker build -t your-registry/connect4-backend:${{ github.sha }} ./backend
          docker push your-registry/connect4-backend:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/connect4 \
            backend=your-registry/connect4-backend:${{ github.sha }}
```

---

For questions or issues, refer to main [README.md](README.md) or [ARCHITECTURE.md](ARCHITECTURE.md)
