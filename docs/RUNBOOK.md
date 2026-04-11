# Operations Runbook

Last updated: 2026-04-12

---

## 1. Local Development

### Prerequisites

- Node.js 20+
- npm 9+
- AVE API key
- MiniMax API key (optional — falls back to deterministic rules)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev --workspace @meme-affinity/web
```

The app runs at `http://localhost:3000`.

### Verify

```bash
# Lint
npm run lint

# Build
npm run build

# Run both
npm run lint && npm run build
```

### Known Local Issues

- Windows path with non-ASCII characters: Turbopack is disabled; webpack mode is used instead.
- PowerShell may block npm; use `cmd /c npm.cmd ...` if needed.
- Default Next.js favicon removed due to path quoting issues.

---

## 2. Production Deployment

### 2.1 VPS Prerequisites

- Ubuntu 20.04+ (8 GB RAM recommended)
- Docker + docker-compose
- Git
- Domain with DNS pointing to VPS
- SSL certificate (Let's Encrypt recommended)

### 2.2 Directory Structure

```
/opt/meme-affinity/
  app/                    # git clone of this repo
  env/.env.production     # production environment variables
  runtime/                # AVE metrics, smartmoney snapshots (bind-mounted)
```

### 2.3 Initial Deployment

```bash
# Clone repo
git clone <REPO_URL> /opt/meme-affinity/app
cd /opt/meme-affinity/app

# Create directories
mkdir -p /opt/meme-affinity/env
mkdir -p /opt/meme-affinity/runtime

# Create production env
cp .env.example /opt/meme-affinity/env/.env.production
nano /opt/meme-affinity/env/.env.production
# Fill in all REQUIRED variables

# Build and start
docker compose up -d --build

# Verify
docker compose logs -f web
curl http://localhost:3000/
```

### 2.4 Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

### 2.5 Update Deployment

```bash
cd /opt/meme-affinity/app
git pull origin main
docker compose up -d --build
docker compose logs -f web
```

### 2.6 Rollback

```bash
cd /opt/meme-affinity/app
git log --oneline -10          # find the last good commit
git checkout <commit-hash>
docker compose up -d --build
```

---

## 3. Runtime Monitoring

### 3.1 Health Check

```bash
# Docker healthcheck (configured in docker-compose.yml)
docker compose ps

# Manual health check
curl -s http://localhost:3000/ | head -5
```

### 3.2 Runtime Files

```bash
# AVE API call counter
cat /opt/meme-affinity/runtime/ave-metrics.json

# Smart-money snapshot
cat /opt/meme-affinity/runtime/smartmoney-snapshot.json
```

### 3.3 Logs

```bash
# All logs
docker compose logs web

# Live logs
docker compose logs -f web

# Last 100 lines
docker compose logs --tail 100 web
```

---

## 4. Failure Recovery

### 4.1 MiniMax Down

**Symptom:** Token/address scoring still works but errors mention "MiniMax fallback".

**Recovery:** No action needed. Deterministic rules produce valid results without MiniMax.

**Monitoring:** Check server logs for `MiniMax.*fallback` entries.

### 4.2 AVE Data API Down

**Symptom:**
- Token scoring returns errors about "AVE token detail request failed"
- Address profiling returns fallback profiles with `sourceStatus: "unavailable"`

**Recovery:** Wait for AVE to recover. The site shows graceful error messages.

### 4.3 AVE Bot API Down (V3 Trading)

**Symptom:** Trade operations fail with 502 errors.

**Recovery:** Trading is non-critical. Token scoring and address profiling continue independently.

### 4.4 Docker Container Crash

```bash
# Check status
docker compose ps

# Restart
docker compose restart web

# If restart fails, rebuild
docker compose up -d --build
```

### 4.5 Runtime File Corruption

```bash
# AVE metrics - safe to delete, starts fresh
rm /opt/meme-affinity/runtime/ave-metrics.json

# Smart-money snapshot - safe to delete, regenerates on next request
rm /opt/meme-affinity/runtime/smartmoney-snapshot.json
```

---

## 5. Frozen Driver System Maintenance

### 5.1 When to Refresh

The frozen driver snapshots become stale as tracked addresses trade new tokens. Refresh when:

- Significant new trading activity by tracked addresses
- Narrative shifts in the BSC meme ecosystem
- Monthly as a routine maintenance task

### 5.2 How to Refresh

1. Run the data collection script against AVE `GET /v2/address/tx` for each tracked address.
2. Process the results through the scoring pipeline.
3. Update `apps/web/src/lib/tracked-driver-systems.data.ts` with new snapshot data.
4. Update `config/tracked-driver-systems.json` with the same data.
5. Update the `generatedAt` timestamp.
6. Run `npm run lint && npm run build`.
7. Deploy.

### 5.3 Current Snapshot Date

- Generated: `2026-04-11T14:43:26.027Z`
- Next recommended refresh: `2026-05-11` or earlier if significant activity detected.

---

## 6. Configuration Changes

### 6.1 Add a New Tracked Address

1. Add entry to `config/tracked-addresses.json`
2. Create frozen driver snapshot in `tracked-driver-systems.data.ts`
3. Update `tracked-driver-systems.json`
4. Update token page `fixedOrder` array in `apps/web/src/app/token/[address]/page.tsx`
5. Run lint + build

### 6.2 Change MiniMax Model

Set `MINIMAX_MODEL` environment variable. No code changes needed.

### 6.3 Change MiniMax Timeout

- Default path: set `MINIMAX_TIMEOUT_MS`
- Fast mode (token/address): change `MINIMAX_SCORING_TIMEOUT_MS` in `score-token.ts` and `MINIMAX_ADDRESS_TIMEOUT_MS` in `score-address.ts`

---

## 7. Security Notes

### 7.1 What the server holds

- AVE Data API key
- MiniMax API key (or Anthropic key alias)
- AVE Bot API key + secret (for V3 trading)

### 7.2 What the browser holds

- `assetsId` string in localStorage (for V3 trading)
- No API keys, no private keys, no mnemonics

### 7.3 What is never stored

- AVE Bot wallet mnemonic (discarded after generation)
- AVE API credentials in client-side code
- Raw API error details (server logs only)

---

## 8. Smoke Test Checklist

Run these after every deployment:

- [ ] `curl -s http://localhost:3000/ | grep "爱赵赵"` — homepage loads
- [ ] `curl -s http://localhost:3000/tech` — tech page loads
- [ ] `curl -s -X POST http://localhost:3000/api/score-token -H 'Content-Type: application/json' -d '{"tokenAddress":"0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444","chain":"bsc"}' | jq '.token.symbol'` — returns `"共建"`
- [ ] `curl -s -X POST http://localhost:3000/api/score-address -H 'Content-Type: application/json' -d '{"address":"0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa","chain":"bsc"}' | jq '.profile.archetype'` — returns archetype
- [ ] `curl -s -X POST http://localhost:3000/api/score-token -H 'Content-Type: application/json' -d '{"tokenAddress":"0x123"}' | jq '.error'` — returns error (400)
- [ ] Runtime files exist: `ls /opt/meme-affinity/runtime/`

---

## 9. Demo Tokens

Pre-validated tokens for demo and testing:

| Token | Address | Why good for demo |
|-------|---------|-------------------|
| Build N Build (共建) | `0xb2acf3ae051c7f0b0b8de90cbb4ed99312574444` | Strongest sample; all 3 tracked addresses have history; top100 hits |
| 币安人生 | `0x924fa68a0fc644485b8df8abfa0a41c2e7744444` | 1 tracked address history + top100 hit |
| 龙虾 (LOB) | `0xeccbb861c0dda7efd964010085488b69317e4444` | 1 tracked address history; highest smart-wallet tag recurrence |

### Demo Wallet Addresses

| Address | Behavior |
|---------|----------|
| `0x2a1c7bc7e697f6bff5ae9122c5b0212fe5ac42aa` | Active wallet: returns full profile with `recentTradeCount = 21` |
| `0x9f3b63f0d4e9c8a7b6f5e4d3c2b1a09876543210` | No-history wallet: returns fallback profile |
| `0x123` | Invalid address: returns 400 error |

---

## 10. AVE API Usage Tracking

The site tracks cumulative AVE API calls in `apps/web/.runtime/ave-metrics.json`.

This counter:
- Persists across server restarts
- Is displayed on the homepage sponsor surface and `/tech` page
- Tracks: token detail calls, top holder calls, smart wallet calls, address tx calls

To reset: delete the file. It recreates on next API call.
