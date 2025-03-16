# Deployment and DevOps

## Overview
Self-hosting configuration and deployment guidelines for the Open Badges server.

## System Requirements

### Minimum Requirements
- 1 CPU core
- 2GB RAM
- 20GB SSD storage
- Linux-based OS (Ubuntu 22.04 LTS recommended)

### Recommended Requirements
- 2+ CPU cores
- 4GB+ RAM
- 40GB+ SSD storage
- Load balancer for high availability

## Installation

### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl build-essential git

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### Database Setup
```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE badges;
CREATE USER badges_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE badges TO badges_user;
\q

# Initialize schema
bun run db:migrate
```

### Application Setup
```bash
# Clone repository
git clone https://github.com/your-org/bun-badges.git
cd bun-badges

# Install dependencies
bun install

# Configure environment
cp .env.example .env
nano .env

# Build application
bun run build

# Run database migrations
bun run db:migrate
```

## Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=production
API_URL=https://api.badges.example.com
CORS_ORIGIN=https://badges.example.com

# Database Configuration
DATABASE_URL=postgresql://badges_user:password@localhost:5432/badges

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Storage Configuration
STORAGE_TYPE=s3
S3_BUCKET=your-badge-images
S3_REGION=us-east-1
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
```

## Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Create PM2 config
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'bun-badges',
    script: 'bun',
    args: 'run start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOL

# Start application
pm2 start ecosystem.config.js
pm2 save

# Setup startup script
pm2 startup
```

### Using Docker
```dockerfile
# Dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
  
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: badges
      POSTGRES_USER: badges_user
      POSTGRES_PASSWORD: your_secure_password

volumes:
  postgres_data:
```

## Monitoring and Maintenance

### Health Checks
```typescript
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    version: process.env.VERSION,
    timestamp: new Date().toISOString()
  });
});
```

### Logging
- Application logs via Pino
- Database query logging
- Error tracking with Sentry
- Access logs via Nginx

### Backup Strategy
```bash
#!/bin/bash
# Database backup script
BACKUP_DIR="/var/backups/badges"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump badges > "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Backup uploaded files
aws s3 sync s3://your-badge-images "$BACKUP_DIR/files_$TIMESTAMP"

# Rotate backups (keep last 7 days)
find "$BACKUP_DIR" -type f -mtime +7 -delete
```

### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update application dependencies
bun update

# Audit dependencies
bun run audit
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Session management
- Cache synchronization
- Database replication

### Performance Optimization
- Response caching
- Query optimization
- Asset compression
- CDN integration

### High Availability
- Multiple application instances
- Database failover
- Automated health checks
- Zero-downtime deployments

## Troubleshooting

### Common Issues
1. Database connection errors
2. Memory usage spikes
3. Slow response times
4. Failed deployments

### Debugging Tools
- Application logs
- Database logs
- System metrics
- Network monitoring

### Recovery Procedures
1. Service restart
2. Database rollback
3. Configuration reset
4. Backup restoration 