FROM node:20-bookworm-slim

# Install Python, C, C++, and Java JDK
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    gcc \
    g++ \
    default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
RUN groupadd --gid 10001 jobway && useradd --uid 10001 --gid jobway --no-create-home jobway \
    && mkdir -p /app/temp && chown -R jobway:jobway /app
COPY --chown=jobway:jobway server.js ./server.js

ENV NODE_ENV=production
USER jobway

# Render expects web services to bind to a port
EXPOSE 8080
CMD ["node", "server.js"]
