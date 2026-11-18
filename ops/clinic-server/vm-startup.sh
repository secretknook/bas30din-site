#!/bin/bash
# Runs on the Google server at every boot. Safe to run many times.
exec >>/var/log/clinic-setup.log 2>&1
echo "== $(date) start"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon /swapfile 2>/dev/null || true
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
mkdir -p /opt/n8n && cd /opt/n8n
cat > docker-compose.yml <<'YML'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    environment:
      - N8N_HOST=bot.bas30din.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://bot.bas30din.com/
      - N8N_EDITOR_BASE_URL=https://bot.bas30din.com/
      - N8N_PROXY_HOPS=1
      - GENERIC_TIMEZONE=Asia/Kolkata
      - TZ=Asia/Kolkata
      - NODE_OPTIONS=--max-old-space-size=600
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=1
    volumes:
      - n8n_data:/home/node/.n8n
  caddy:
    image: caddy:2
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
volumes:
  n8n_data:
  caddy_data:
YML
cat > Caddyfile <<'CADDY'
bot.bas30din.com {
  encode gzip
  reverse_proxy n8n:5678
}
desk.bas30din.com {
  encode gzip
  handle /api {
    rewrite * /webhook/desk-api
    reverse_proxy n8n:5678
  }
  handle {
    rewrite * /webhook/desk?{query}
    reverse_proxy n8n:5678 {
      header_down -Content-Security-Policy
    }
  }
}
CADDY
docker compose up -d
echo "== $(date) done"
