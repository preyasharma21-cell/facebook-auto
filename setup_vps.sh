#!/bin/bash
# AutoPilot Pro - One-Click Ubuntu Cloud Server Setup
# Run this on any free Ubuntu VPS (Oracle Cloud, AWS Free, etc.)
set -e

echo "=== Updating System & Installing Dependencies ==="
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y curl git python3 python3-pip python3-venv ffmpeg

echo "=== Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== Installing Python yt-dlp & curl-cffi ==="
python3 -m pip install --upgrade yt-dlp curl-cffi --break-system-packages || pip install --upgrade yt-dlp curl-cffi

echo "=== Installing Project Dependencies & Building ==="
npm install
npm run build

echo "=== Starting AutoPilot 24/7 with PM2 ==="
pm2 start npm --name "autopilot" -- run start
pm2 startup || true
pm2 save

echo "======================================================"
echo "✅ SUCCESS! AutoPilot Pro is now running 24/7 online!"
echo "Your laptop can be turned OFF now, and it will keep working!"
echo "Access your dashboard at: http://$(curl -s ifconfig.me):3000"
echo "======================================================"
