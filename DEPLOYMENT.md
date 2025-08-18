# MongoDB DR Simulator - Deployment Guide

This guide covers different deployment options for the MongoDB DR Simulator application.

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker installed on your system
- Docker Compose (optional, but recommended)

### Quick Deploy with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mongodb-dr-simulator
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Open your browser to [http://localhost:3000](http://localhost:3000)

### Manual Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t mongodb-dr-simulator .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     --name mongodb-dr-simulator \
     -p 3000:3000 \
     -e NODE_ENV=production \
     mongodb-dr-simulator
   ```

3. **Check container status**
   ```bash
   docker ps
   docker logs mongodb-dr-simulator
   ```

### Docker Image Features

- **Multi-stage build** for optimized image size
- **Non-root user** for security
- **Health checks** for monitoring
- **Production-ready** configuration
- **Alpine Linux** base for minimal footprint

## 🌐 Production Deployment Options

### Option 1: Cloud Platforms

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku container:push web
heroku container:release web
heroku open
```

#### Railway
1. Connect your GitHub repository
2. Deploy automatically on push
3. Custom domain available

#### Vercel/Netlify
```bash
npm run build
# Deploy build output
```

### Option 2: VPS/Server Deployment

#### Using Docker on Ubuntu/CentOS
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone and deploy
git clone <your-repo-url>
cd mongodb-dr-simulator
docker-compose up -d

# Setup reverse proxy (nginx)
sudo apt install nginx
# Configure nginx to proxy to localhost:3000
```

#### Using PM2 (Node.js Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "mongodb-dr-simulator" -- start
pm2 save
pm2 startup
```

## ⚙️ Environment Configuration

### Environment Variables
```bash
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

### Docker Environment File (.env)
```bash
# Create .env file for docker-compose
NODE_ENV=production
PORT=3000
```

## 🔧 Performance Optimization

### Docker Production Optimizations
- Uses multi-stage builds to reduce image size
- Runs as non-root user for security
- Includes health checks for monitoring
- Optimized Next.js standalone output

### Nginx Reverse Proxy (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoring & Health Checks

### Docker Health Check
The container includes a built-in health check that:
- Pings the application every 30 seconds
- Times out after 3 seconds
- Retries 3 times before marking as unhealthy

### Logs
```bash
# Docker logs
docker logs -f mongodb-dr-simulator

# Docker Compose logs
docker-compose logs -f
```

## 🚀 CI/CD Pipeline Example

### GitHub Actions
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Build Docker image
      run: docker build -t mongodb-dr-simulator .
    
    - name: Deploy to server
      run: |
        # Your deployment commands here
        docker-compose up -d
```

## 🔒 Security Considerations

1. **Run as non-root user** (already configured)
2. **Use HTTPS in production** (configure reverse proxy)
3. **Keep dependencies updated**
4. **Monitor for vulnerabilities**
5. **Use environment variables for sensitive data**

## 🛠️ Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Change port in docker-compose.yml
   ports:
     - "3001:3000"
   ```

2. **Build failures**
   ```bash
   # Clear Docker cache
   docker system prune -a
   # Rebuild without cache
   docker build --no-cache -t mongodb-dr-simulator .
   ```

3. **Container exits immediately**
   ```bash
   # Check logs
   docker logs mongodb-dr-simulator
   ```

### Performance Issues
- Ensure adequate memory allocation
- Check Docker resource limits
- Monitor application performance

---

## 📞 Support

For deployment issues or questions:
- Check the logs first
- Ensure all prerequisites are installed
- Verify port availability
- Test locally before deploying to production
