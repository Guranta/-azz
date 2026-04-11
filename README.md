# BSC Meme Affinity Platform

BSC meme-token affinity analysis and trading product:
- Public website for token scoring, address profiling, and BSC trading
- OpenClaw skill for token analysis and trade instructions

## Workspace Layout

```text
apps/web          Next.js website and API
packages/core     Shared types and service interfaces
config            Persona and tracked-address configuration
skills            OpenClaw skill assets
docs              Project handoff and task tracking
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Deployment

### VPS Directory Layout

All deployment files live under `/opt/meme-affinity/`:

```text
/opt/meme-affinity/
  app/                    # git clone of this repo
  env/
    .env.production       # production environment variables
  runtime/                # AVE metrics, smartmoney snapshots (persisted)
```

### VPS Prerequisites

- Ubuntu 20.04+ (8 GB RAM recommended)
- Docker and Docker Compose installed
- Git installed
- Ports 80 and 443 open (for nginx)
- Port 3000 available internally

### Initial Setup

```bash
# 1. Create directory structure
sudo mkdir -p /opt/meme-affinity/{app,env,runtime}

# 2. Set runtime directory ownership for the container user (UID/GID 1001)
#    This is required — the container runs as nextjs (1001:1001) and the
#    bind mount masks the image-layer permissions.
sudo chown 1001:1001 /opt/meme-affinity/runtime

# 3. Clone the repo
sudo git clone <PUBLIC_GITHUB_REPO_URL> /opt/meme-affinity/app

# 4. Create the production env file
sudo cp /opt/meme-affinity/app/apps/web/.env.example /opt/meme-affinity/env/.env.production
sudo nano /opt/meme-affinity/env/.env.production
```

### Environment Variables

Edit `/opt/meme-affinity/env/.env.production` and fill in the required values:

```bash
# REQUIRED — AVE public API for token/address data
AVE_API_KEY=<your_ave_api_key>
AVE_DATA_BASE_URL=https://prod.ave-api.com

# REQUIRED — MiniMax for AI scoring
MINIMAX_API_KEY=<your_minimax_api_key>
MINIMAX_BASE_URL=https://api.minimaxi.com/anthropic
MINIMAX_API_STYLE=anthropic
MINIMAX_MODEL=MiniMax-M2.7

# OPTIONAL — AVE Bot Wallet API (enables V3 trading features)
# AVE_BOT_API_KEY=
# AVE_BOT_API_SECRET=
# AVE_BOT_BASE_URL=https://bot-api.ave.ai

# REQUIRED — public URL of this deployment
PUBLIC_BASE_URL=https://your-domain.com
```

See `apps/web/.env.example` for the full list with descriptions.

### Build and Start

```bash
cd /opt/meme-affinity/app
docker compose up -d --build
```

First build takes 2-3 minutes. Subsequent starts are instant.

### Verify

```bash
# Check container is running
docker compose ps

# Check logs
docker compose logs -f web

# Test the API
curl -s http://localhost:3000/api/score-token \
  -X POST -H "Content-Type: application/json" \
  -d '{"tokenAddress":"0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444","chain":"bsc"}' | head -c 200
```

### Logs

```bash
# Follow logs
docker compose -f /opt/meme-affinity/app/docker-compose.yml logs -f web

# Last 100 lines
docker compose -f /opt/meme-affinity/app/docker-compose.yml logs --tail 100 web
```

### Restart

```bash
cd /opt/meme-affinity/app && docker compose restart web
```

### Update

```bash
cd /opt/meme-affinity/app
git pull origin main
docker compose up -d --build
```

### Nginx (Recommended)

Place an nginx config in front of the container for TLS and domain routing:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS, add SSL certificates (e.g. via certbot/Let's Encrypt) and update the listen directive to `listen 443 ssl`.

### Runtime Data

The runtime directory `/opt/meme-affinity/runtime` stores AVE metrics and smartmoney snapshots. It is bind-mounted into the container at `/app/apps/web/.runtime` and persists across container restarts and rebuilds.

To inspect:

```bash
ls -la /opt/meme-affinity/runtime/
```

## API Endpoints

### V1 Token Scoring

```
POST /api/score-token
Body: { "tokenAddress": "0x...", "chain": "bsc" }
```

### V2 Address Profiling

```
POST /api/score-address
Body: { "address": "0x...", "chain": "bsc" }
```

### V3 Trading

```
POST /api/trade/wallet/generate
GET  /api/trade/wallet?assetsId=...
POST /api/trade/approve
POST /api/trade/swap
GET  /api/trade/orders?ids=...
```

## Planning Docs

- `docs/PROJECT_HANDOFF.md` — master plan, progress, constraints
- `docs/TASK_TRACKER.md` — live progress board
- `docs/V3_TRADING_CONTRACT.md` — V3 trading API contract
