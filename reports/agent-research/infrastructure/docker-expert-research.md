# Docker Expert Research

Research for Docker containerization expert agent focusing on optimization, security, and orchestration patterns.

## Research Overview

**One-sentence scope**: "Docker containerization, image optimization, multi-stage builds, security hardening, and container orchestration patterns"

## High-Frequency Problems (15 Core Issues)

### Tier 1: Critical Daily Issues (High Frequency, Medium-High Complexity)
1. **Dockerfile optimization and multi-stage build configuration** (high freq, medium complexity)
2. **Container image size reduction and layer optimization** (high freq, medium complexity)  
3. **Docker Compose service configuration and networking** (high freq, medium complexity)
4. **Container security scanning and vulnerability management** (medium freq, high complexity)
5. **Environment variable management and secrets handling** (high freq, medium complexity)

### Tier 2: Common Operational Issues (High-Medium Frequency, Low-Medium Complexity)
6. **Volume mounting and data persistence strategies** (high freq, low complexity)
7. **Build context optimization and .dockerignore configuration** (high freq, low complexity)
8. **Container debugging and troubleshooting techniques** (high freq, low complexity)
9. **Development workflow integration and hot reloading** (medium freq, medium complexity)
10. **Container resource limits and performance optimization** (medium freq, medium complexity)

### Tier 3: Infrastructure & Production Issues (Medium-Low Frequency, Medium-High Complexity)
11. **Container networking and service discovery setup** (medium freq, high complexity)
12. **Container registry management and image distribution** (medium freq, medium complexity)
13. **Health checks and container monitoring implementation** (medium freq, medium complexity)
14. **Cross-platform builds and multi-architecture support** (low freq, high complexity)
15. **Production deployment patterns and container orchestration** (low freq, high complexity)

## Topic Categories (6 Core Areas)

### Category 1: Dockerfile & Image Optimization
**Focus**: Multi-stage builds, layer caching, image size reduction, distroless images
- Advanced Dockerfile patterns and optimization techniques
- Multi-stage build strategies for different environments
- Layer caching optimization and build context management
- Distroless and minimal base image selection
- Image size reduction techniques (Alpine vs distroless vs scratch)

**Key Patterns**:
```dockerfile
# Multi-stage build with build cache optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app .
USER nextjs
```

### Category 2: Docker Compose & Multi-Service Setup
**Focus**: Service orchestration, networking, dependency management, development workflows
- Docker Compose networking and service discovery
- Environment-specific compose file management (dev/prod/test)
- Service dependency ordering and health checks
- Volume management and data sharing between services
- Development hot-reloading and file watching

**Key Patterns**:
```yaml
# Production-ready compose with health checks and dependencies
services:
  app:
    build:
      context: .
      target: production
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Category 3: Security & Vulnerability Management
**Focus**: Container security, image scanning, secrets management, runtime security
- Container security scanning and vulnerability assessment
- Secrets management and environment variable security
- Runtime security with non-root users and restricted capabilities
- Image signing and supply chain security
- Security scanning integration in CI/CD pipelines

**Key Patterns**:
```dockerfile
# Security-hardened container
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs
COPY --chown=nextjs:nodejs . .
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Category 4: Networking & Service Discovery
**Focus**: Container networking, port management, service communication, load balancing
- Docker networking modes and custom networks
- Service discovery patterns and communication
- Load balancing and traffic routing
- Port management and exposure strategies
- Network security and isolation

**Key Patterns**:
```yaml
# Custom networks with service discovery
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
services:
  web:
    networks:
      - frontend
      - backend
```

### Category 5: Development Workflow Integration
**Focus**: Hot reloading, debugging, testing, CI/CD integration
- Development environment setup and hot reloading
- Container debugging techniques and tools
- Testing strategies with containers
- CI/CD pipeline integration and build optimization
- Local development workflow patterns

**Key Patterns**:
```yaml
# Development workflow with hot reloading
services:
  app:
    build:
      context: .
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### Category 6: Production & Orchestration
**Focus**: Production deployment, monitoring, scaling, orchestration
- Production deployment patterns and best practices
- Container monitoring and logging strategies
- Resource management and scaling patterns
- Integration with orchestration platforms (Docker Swarm, Kubernetes)
- Production debugging and troubleshooting

## Environment Detection Patterns

### Docker Installation Detection
```bash
# Docker version and installation type
docker --version
docker info | grep "Server Version"

# Docker Desktop vs Docker Engine detection
docker context ls
docker info | grep "Operating System"
```

### Project Structure Detection
```bash
# Dockerfile variants
find . -name "Dockerfile*" -type f
ls -la Dockerfile{,.dev,.prod,.test} 2>/dev/null

# Docker Compose detection
find . -name "*compose*.yml" -o -name "*compose*.yaml" -type f
```

### Runtime Environment Detection
```bash
# Container runtime detection
docker info | grep "Container Runtime"
docker system info | grep "Runtime"

# Registry configuration
docker info | grep "Registry"
cat ~/.docker/config.json 2>/dev/null
```

## Common Error Patterns & Solutions

### Build Optimization Issues
**Symptom**: Slow Docker builds, large image sizes
**Root Causes**: Poor layer caching, inefficient COPY instructions, missing .dockerignore
**Solutions**: Multi-stage builds, layer optimization, build context reduction

### Security Vulnerabilities
**Symptom**: Container security scan failures, exposed secrets
**Root Causes**: Outdated base images, secrets in environment variables, root user execution
**Solutions**: Regular base image updates, secrets management, non-root user configuration

### Networking & Service Discovery
**Symptom**: Services can't communicate, port conflicts, DNS resolution failures
**Root Causes**: Missing custom networks, port binding conflicts, service naming issues
**Solutions**: Custom Docker networks, proper service naming, health checks

### Performance & Resource Issues
**Symptom**: High memory usage, slow container startup, resource exhaustion
**Root Causes**: No resource limits, inefficient application code, large image sizes
**Solutions**: Resource limits, application optimization, image size reduction

## Sub-domain Expert Recommendations

### When to Recommend Other Experts
- **DevOps Expert**: CI/CD pipeline integration, infrastructure automation, deployment strategies
- **Kubernetes Expert**: Container orchestration, service mesh, advanced networking, scaling
- **Security Expert**: Advanced security scanning, compliance requirements, threat modeling
- **Node.js/Python/Go Expert**: Application-specific optimization within containers
- **Database Expert**: Database containerization, data persistence, backup strategies

### Handoff Criteria
- **Kubernetes**: When discussing pods, services, ingress, or cluster-level orchestration
- **Security**: When dealing with compliance standards, advanced threat detection, or security policies
- **DevOps**: When focusing on CI/CD pipelines, infrastructure as code, or deployment automation
- **Language-specific**: When container issues are primarily application code related

## Official Documentation Sources

### Primary Sources
- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

### Security & Optimization
- [Docker Security](https://docs.docker.com/engine/security/)
- [Docker Image Optimization](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/develop/dev-best-practices/#use-multi-stage-builds)

### Production & Orchestration
- [Production Deployment](https://docs.docker.com/engine/swarm/)
- [Docker Registry](https://docs.docker.com/registry/)
- [Container Monitoring](https://docs.docker.com/config/containers/logging/)

## Advanced Patterns & Non-Obvious Solutions

### Advanced Multi-Stage Optimization
```dockerfile
# Cache dependencies separately from source code
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
USER 1000
CMD ["node", "dist/index.js"]
```

### Docker Compose Environment Management
```yaml
# Environment-specific overrides
# docker-compose.yml (base)
services:
  app:
    build: .
    environment:
      - NODE_ENV=${NODE_ENV:-development}

# docker-compose.override.yml (development)
services:
  app:
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development

# docker-compose.prod.yml (production)
services:
  app:
    image: myapp:latest
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

### Container Health Monitoring
```dockerfile
# Sophisticated health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Or with custom health script
COPY health-check.sh /usr/local/bin/
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD ["/usr/local/bin/health-check.sh"]
```

### Build Context Optimization
```dockerignore
# Comprehensive .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
.eslintrc*
.prettierrc*
```

### Cross-Platform Builds
```bash
# Multi-architecture builds
docker buildx create --name mybuilder --use
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .
```

## Testing & Validation Strategies

### Container Testing Patterns
```bash
# Security scanning
docker scout quickview myapp:latest
docker scout cves myapp:latest

# Image analysis
docker history myapp:latest
docker image inspect myapp:latest

# Runtime testing
docker run --rm -d --name test-container myapp:latest
docker exec test-container /health-check.sh
docker stop test-container
```

### Development Testing
```yaml
# Test-specific compose
services:
  app:
    build:
      context: .
      target: test
    command: npm test
    environment:
      - NODE_ENV=test
```

## Performance Optimization Techniques

### Layer Caching Optimization
```dockerfile
# Optimize for layer caching
FROM node:18-alpine
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code last (frequently changing)
COPY . .
CMD ["npm", "start"]
```

### Resource Management
```yaml
# Resource limits and reservations
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

This research provides comprehensive coverage of Docker containerization expertise, focusing on practical optimization, security hardening, and orchestration patterns that developers encounter in real-world scenarios.