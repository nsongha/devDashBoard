# Dev Dashboard — Deployment Guide

## Overview

Dev Dashboard is a Node.js Express application. It can be deployed using:

- **PM2** (recommended for production on a VPS/server)
- **Docker** (containerized deployment)
- **Nginx** reverse proxy (for HTTPS + domain name)

Default port: **4321**

---

## Option 1: PM2 (Recommended)

PM2 is a production process manager for Node.js with auto-restart and log management.

### Install PM2

```bash
npm install -g pm2
```

### Start the Dashboard

```bash
# Navigate to project directory
cd /path/to/dev-dashboard

# Install dependencies
npm install

# Start with PM2
pm2 start src/server.mjs --name "dev-dashboard" --interpreter node

# Save process list to auto-restart on server reboot
pm2 save
pm2 startup
```

### Useful PM2 Commands

```bash
pm2 status              # Check running processes
pm2 logs dev-dashboard  # View logs
pm2 restart dev-dashboard
pm2 stop dev-dashboard
pm2 delete dev-dashboard
```

### Custom Port

```bash
PORT=8080 pm2 start src/server.mjs --name "dev-dashboard"
```

### PM2 Ecosystem File (Optional)

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'dev-dashboard',
      script: 'src/server.mjs',
      env: {
        PORT: 4321,
        NODE_ENV: 'production',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
```

---

## Option 2: Docker

### Dockerfile

Create `Dockerfile` at project root:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install git (required for git log collection)
RUN apk add --no-cache git

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4321

CMD ["node", "src/server.mjs"]
```

### Build & Run

```bash
# Build image
docker build -t dev-dashboard .

# Run container
docker run -d \
  --name dev-dashboard \
  -p 4321:4321 \
  -v /your/repos:/repos:ro \
  -v /path/to/config.json:/app/config.json \
  dev-dashboard
```

> ⚠️ Mount your local repo paths into the container so the dashboard can access them. Use `:ro` (read-only) for security.

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  dev-dashboard:
    build: .
    ports:
      - '4321:4321'
    volumes:
      - /your/repos:/repos:ro
      - ./config.json:/app/config.json
    restart: unless-stopped
    environment:
      - PORT=4321
```

```bash
docker-compose up -d
docker-compose logs -f
```

---

## Option 3: Nginx Reverse Proxy

After deploying with PM2 or Docker, set up Nginx for HTTPS and a custom domain.

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# macOS (Homebrew)
brew install nginx
```

### Nginx Config

Create `/etc/nginx/sites-available/dev-dashboard`:

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    # Redirect HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.yourdomain.com/privkey.pem;

    # WebSocket support (required for real-time features)
    location /ws {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dev-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.yourdomain.com
```

---

## Security Considerations

### Access Control

The dashboard currently has no authentication. If deploying publicly:

1. **Restrict by IP** in Nginx:

```nginx
location / {
    allow 192.168.1.0/24;  # Your office IP range
    deny all;
    proxy_pass http://localhost:4321;
}
```

2. **HTTP Basic Auth** with Nginx:

```bash
sudo htpasswd -c /etc/nginx/.htpasswd youruser
```

```nginx
location / {
    auth_basic "Dev Dashboard";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:4321;
}
```

### config.json

- Never commit `config.json` to git (it's in `.gitignore`)
- Set file permissions: `chmod 600 config.json`
- Store secrets via environment variables in production (future enhancement)

### Repository Access

- The app only runs `git log`, `git shortlog`, `git diff` — all read-only commands
- Mount repo directories as read-only in Docker (`-v /repos:/repos:ro`)
- Use a dedicated read-only Git user for server deployments

---

## Environment Variables

| Variable | Default | Description      |
| -------- | ------- | ---------------- |
| `PORT`   | `4321`  | HTTP server port |

---

## Health Check

Once deployed, verify the server is running:

```bash
curl http://localhost:4321/api/projects
# Expected: {"projects":[...]}
```

For Nginx + domain:

```bash
curl https://dashboard.yourdomain.com/api/projects
```
