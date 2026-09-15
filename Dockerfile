# AutoPilot Pro - Hugging Face Spaces Production Dockerfile
FROM node:20-bookworm-slim

# Install system dependencies: Python, pip, FFmpeg, and tools
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

# Create Hugging Face Spaces standard non-root user (UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user
WORKDIR /app

# Copy package configuration & install dependencies
COPY --chown=user:user package*.json ./
RUN npm install

# Copy application source code
COPY --chown=user:user . .

# Create necessary directories and set permissions
RUN mkdir -p uploads data && chown -R user:user /app

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Switch to non-root user for Hugging Face container security
USER user

# Port configuration (Works on Render, VPS, and Docker)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000 7860

CMD ["npm", "run", "start"]
