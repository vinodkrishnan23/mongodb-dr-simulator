# MongoDB DR Simulator - Docker Deployment Guide

## 🐳 Enhanced Docker Configuration

This project now includes an optimized, production-ready Docker setup with enhanced security, performance, and deployment options.

## 📋 Features

### ✅ **Enhanced Dockerfile**
- **Multi-stage build** with optimized layers
- **Node.js 20 Alpine** for latest features and security
- **Enhanced security** with non-root user and proper permissions
- **Comprehensive health checks** with fallback endpoints
- **Resource optimization** for production deployment
- **Proper signal handling** with dumb-init

### ✅ **Flexible Docker Compose**
- **Production service** with resource limits and security options
- **Development service** with hot reload support  
- **Optional Nginx proxy** with SSL/TLS support
- **Environment variable** configuration
- **Service profiles** for different deployment scenarios

### ✅ **Advanced Health Monitoring**
- **Multi-endpoint health checks** with fallbacks
- **Enhanced error logging** and timeout handling
- **Docker health check integration**
- **Monitoring-friendly status endpoints**

## 🚀 Quick Start

### **1. Production Deployment**

```bash
# Build and start the production service
docker-compose up -d mongodb-dr-simulator

# Check logs
docker-compose logs -f mongodb-dr-simulator

# Access the application
open http://localhost:3000
```

### **2. Development with Hot Reload**

```bash
# Start development service with hot reload
docker-compose --profile development up -d mongodb-dr-simulator-dev

# Access development server
open http://localhost:3001
```

### **3. Full Stack with Nginx Proxy**

```bash
# Start with Nginx reverse proxy
docker-compose --profile proxy up -d

# Access through proxy
open http://localhost
```

## ⚙️ Configuration Options

### **Environment Variables**

Create a `.env` file in the project root:

```env
# Application Configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Next.js Configuration  
NEXT_TELEMETRY_DISABLED=1

# Docker Compose Configuration
DOMAIN=localhost
DEV_PORT=3001

# Resource Limits (optional)
MEMORY_LIMIT=512M
CPU_LIMIT=1.0
```

### **Service Profiles**

- **Default**: Production service only
- **Development**: Includes hot-reload development service
- **Proxy**: Includes Nginx reverse proxy with SSL support

```bash
# Use specific profiles
docker-compose --profile development --profile proxy up -d
```

## 🔧 Build Options

### **Multi-Stage Build Targets**

```bash
# Build only base image (for development)
docker build --target base -t mongodb-dr-simulator:base .

# Build with dependencies (for CI)
docker build --target deps -t mongodb-dr-simulator:deps .

# Build complete production image
docker build --target runner -t mongodb-dr-simulator:latest .
```

### **Build Arguments**

```bash
# Custom Node.js version
docker build --build-arg NODE_VERSION=20-alpine .

# Development build
docker build --build-arg NODE_ENV=development .
```

## 🚀 Production Deployment

### **Container Registry**

```bash
# Tag for registry
docker tag mongodb-dr-simulator:latest your-registry.com/mongodb-dr-simulator:v1.0.0

# Push to registry
docker push your-registry.com/mongodb-dr-simulator:v1.0.0
```

### **Kubernetes Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-dr-simulator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mongodb-dr-simulator
  template:
    metadata:
      labels:
        app: mongodb-dr-simulator
    spec:
      containers:
      - name: mongodb-dr-simulator
        image: your-registry.com/mongodb-dr-simulator:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            memory: "512Mi"
            cpu: "1000m"
          requests:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## 📊 Monitoring & Health Checks

### **Health Check Endpoints**

- **Primary**: `GET /api/health` (if implemented)
- **Fallback**: `GET /` (application root)
- **Docker**: Built-in health check with `healthcheck.js`

### **Health Check Status**

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View health check logs
docker inspect mongodb-dr-simulator --format='{{.State.Health.Status}}'

# Manual health check
docker exec mongodb-dr-simulator node healthcheck.js
```

## 🔒 Security Features

### **Container Security**

- **Non-root user** (uid/gid 1001)
- **Read-only filesystem** where possible
- **No new privileges** flag
- **Minimal attack surface** with Alpine Linux
- **Security updates** included in base image

### **Network Security**

- **Custom Docker network** isolation
- **Nginx proxy** with security headers
- **Rate limiting** and DDoS protection
- **SSL/TLS termination** support

## 🛠️ Development

### **Local Development Setup**

```bash
# Start development environment
docker-compose --profile development up -d

# Install dependencies inside container
docker-compose exec mongodb-dr-simulator-dev npm install

# Run tests
docker-compose exec mongodb-dr-simulator-dev npm test

# Build application
docker-compose exec mongodb-dr-simulator-dev npm run build
```

### **Debugging**

```bash
# Enter container shell
docker-compose exec mongodb-dr-simulator sh

# View application logs
docker-compose logs -f mongodb-dr-simulator

# Check resource usage
docker stats mongodb-dr-simulator
```

## 📈 Performance Optimization

### **Image Optimization**

- **Multi-stage builds** reduce final image size
- **Layer caching** optimizes build times  
- **Alpine Linux** provides minimal base
- **npm ci --only=production** excludes dev dependencies

### **Runtime Optimization**

- **Resource limits** prevent resource exhaustion
- **Health checks** enable automatic recovery
- **Signal handling** ensures graceful shutdowns
- **Gzip compression** reduces bandwidth usage

## 🔄 CI/CD Integration

### **GitHub Actions Example**

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t mongodb-dr-simulator:${{ github.sha }} .
    
    - name: Run tests
      run: docker run --rm mongodb-dr-simulator:${{ github.sha }} npm test
    
    - name: Push to registry
      run: |
        docker tag mongodb-dr-simulator:${{ github.sha }} ${{ secrets.REGISTRY }}/mongodb-dr-simulator:latest
        docker push ${{ secrets.REGISTRY }}/mongodb-dr-simulator:latest
```

## 🆘 Troubleshooting

### **Common Issues**

1. **Build failures**: Check Docker daemon is running
2. **Permission errors**: Ensure proper file ownership
3. **Health check failures**: Verify application starts correctly
4. **Port conflicts**: Check if ports 3000/80/443 are available

### **Debug Commands**

```bash
# Check container logs
docker-compose logs mongodb-dr-simulator

# Inspect container configuration
docker inspect mongodb-dr-simulator

# Test connectivity
curl -v http://localhost:3000

# Check health status
docker-compose ps
```

## 📞 Support

For deployment issues or questions:
1. Check the application logs first
2. Verify environment variables are set correctly  
3. Ensure Docker and Docker Compose are up to date
4. Review the troubleshooting section above

---

**🎉 Your MongoDB DR Simulator is now ready for production deployment with enterprise-grade Docker configuration!**
