# Dockerfile for Vox DPSI Backend
# Render docker runtime — dockerCommand: cd server && node index.js

FROM node:20-alpine

WORKDIR /app

# Copy server files to /app/server/
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

COPY server/ ./server/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Entrypoint that changes to server dir and runs the app
WORKDIR /app/server
CMD ["node", "index.js"]
