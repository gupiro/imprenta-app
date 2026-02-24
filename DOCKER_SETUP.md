# Docker Setup for Imprenta App

## Quick Start

### Production Build & Run
```bash
docker compose up -d
```
Application runs on `http://localhost:3000`

### Development with Hot Reload
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
Changes to files are automatically synced to the container.

### View Logs
```bash
docker compose logs -f app
```

### Stop Containers
```bash
docker compose down
```

---

## What's Included

### **Dockerfile** (Multi-stage production build)
- **Builder stage**: Installs dependencies
- **Production stage**: Optimized runtime image with:
  - Non-root `nodejs` user (security best practice)
  - `dumb-init` for proper signal handling
  - Health checks every 30 seconds
  - Minimal final image size (~1.89GB with dependencies)

### **docker-compose.yml** (Production)
- Port mapping: `3000:3000`
- Volume mounts for persistent data:
  - `./data` → SQLite database
  - `./public/uploads` → Uploaded files
- Auto-restart on failure
- Health checks enabled

### **docker-compose.dev.yml** (Development)
- Enables file watching with `docker compose watch`
- Code changes automatically sync to container
- Runs `npm run dev` (nodemon for live reload)
- Same volume mounts for consistency

### **.dockerignore**
- Excludes node_modules, docs, and unnecessary files
- Reduces build context size

---

## Data Persistence

- **SQLite Database**: Stored in `./data` directory (survives container restarts)
- **Uploads**: Stored in `./public/uploads` (survives container restarts)

---

## Environment Variables

Current defaults in docker-compose.yml:
- `PORT=3000`
- `NODE_ENV=production`

To override, edit the `environment:` section in docker-compose.yml or pass `-e` flags:
```bash
docker compose up -d -e NODE_ENV=development
```

---

## Troubleshooting

### Container exits immediately
```bash
docker compose logs app
```
Check for database errors or missing dependencies.

### Port 3000 already in use
Edit docker-compose.yml and change the port mapping:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Clear everything and rebuild
```bash
docker compose down -v
docker compose up --build
```

---

## Build Details

- **Base Image**: `node:20-alpine` (lightweight, ~160MB)
- **Dependencies**: Compiled with npm ci (deterministic install)
- **User**: Runs as `nodejs:nodejs` (UID 1001) for security
- **Signals**: Handled by dumb-init for graceful shutdown
