#!/bin/bash
# Pappy Ultimate Operator — VPS Setup Script
# Run as root or with sudo: bash setup.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║   Pappy Ultimate Operator — VPS Setup    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. System update ──────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Updating system...${NC}"
apt update -y && apt upgrade -y

# ── 2. Node.js 22 ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/7] Installing Node.js 22...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
echo "Node: $(node -v)  |  npm: $(npm -v)"

# ── 3. MongoDB 7 ──────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/7] Installing MongoDB 7...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" \
    | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update -y
apt install -y mongodb-org
systemctl enable --now mongod
echo "MongoDB: $(mongod --version | head -1)"

# ── 4. Redis ──────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/7] Installing Redis...${NC}"
apt install -y redis-server
systemctl enable --now redis-server
echo "Redis: $(redis-server --version)"

# ── 5. System tools ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/7] Installing system tools (ffmpeg, yt-dlp)...${NC}"
apt install -y ffmpeg
wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
echo "ffmpeg: $(ffmpeg -version 2>&1 | head -1)"
echo "yt-dlp: $(yt-dlp --version)"

# ── 6. PM2 ────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/7] Installing PM2...${NC}"
npm install -g pm2
echo "PM2: $(pm2 --version)"

# ── 7. Bot dependencies ───────────────────────────────────────────────────────
echo -e "${YELLOW}[7/7] Installing bot Node.js dependencies...${NC}"
npm install

# ── Create required data directories ─────────────────────────────────────────
mkdir -p data/sessions data/logs data/mongodb data/temp_media

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS:"
echo ""
echo "  1. Copy your .env:    cp .env.example .env && nano .env"
echo "  2. Start the bot:     pm2 start ecosystem.config.js"
echo "  3. Save PM2 state:    pm2 save"
echo "  4. Auto-start on boot: pm2 startup  (then run the printed command)"
echo "  5. Watch logs:        pm2 logs pappy-bot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  To transfer your existing session (skip re-pairing):"
echo "  scp -r old-server:~/pappy/data/sessions ./data/"
echo ""
