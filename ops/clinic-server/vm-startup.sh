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
# Email for n8n (forgot password, invites). The login and app password are NOT in this file:
# they are read from the VM's own metadata keys smtp-user / smtp-pass (set in the Google Cloud console).
MD=http://metadata.google.internal/computeMetadata/v1/instance/attributes
SMTP_USER=$(curl -sf -H 'Metadata-Flavor: Google' $MD/smtp-user || true)
SMTP_PASS=$(curl -sf -H 'Metadata-Flavor: Google' $MD/smtp-pass || true)
umask 077
if [ -n "$SMTP_USER" ] && [ -n "$SMTP_PASS" ]; then
  printf 'N8N_EMAIL_MODE=smtp\nN8N_SMTP_HOST=smtp.zoho.in\nN8N_SMTP_PORT=465\nN8N_SMTP_SSL=true\nN8N_SMTP_USER=%s\nN8N_SMTP_PASS=%s\nN8N_SMTP_SENDER=OkayBridge <%s>\n' "$SMTP_USER" "$SMTP_PASS" "$SMTP_USER" > .env.mail
else
  : > .env.mail
fi
umask 022
cat > docker-compose.yml <<'YML'
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    env_file:
      - .env.mail
    environment:
      - N8N_HOST=admin.okaybridge.com
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://api.okaybridge.com/
      - N8N_EDITOR_BASE_URL=https://admin.okaybridge.com/
      - N8N_PROXY_HOPS=1
      - GENERIC_TIMEZONE=Asia/Kolkata
      - TZ=Asia/Kolkata
      - NODE_OPTIONS=--max-old-space-size=600
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=1
      - N8N_RUNNERS_GRANT_TOKEN_TTL=300
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
# Public addresses: only webhooks (WhatsApp, missed calls, receipts) and the health check.
# The n8n login page is NOT served here.
bot.bas30din.com, api.okaybridge.com {
  encode gzip
  @public path /webhook/* /webhook-test/* /healthz
  handle @public {
    reverse_proxy n8n:5678
  }
  handle {
    respond "Not found" 404
  }
}
# n8n editor: only reachable through Cloudflare (Cloudflare Access email login in front).
# Direct visits to the server IP are refused.
admin.okaybridge.com {
  tls internal
  encode gzip
  @notcf not remote_ip 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
  respond @notcf "Forbidden" 403
  reverse_proxy n8n:5678
}
desk.bas30din.com, clinic.okaybridge.com {
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
