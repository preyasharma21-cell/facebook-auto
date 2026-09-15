# AutoPilot Pro - Production Dockerfile for Render.com & Cloud
FROM node:20-bookworm-slim

# Install system dependencies: Python, pip, FFmpeg, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment and install yt-dlp + curl-cffi
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip yt-dlp curl-cffi

WORKDIR /app

# Copy package configuration & install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Create necessary persistent directories and assign permissions to built-in 'node' user (UID 1000)
RUN mkdir -p uploads data && chown -R node:node /app

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Switch to the non-root 'node' user included with Node.js
USER node

# Port configuration for Render ($PORT is dynamically assigned by Render, e.g. 10000)
ENV HOSTNAME="0.0.0.0"
EXPOSE 10000 3000 7860

# Start Next.js on the dynamic PORT provided by Render (defaulting to 3000)
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
