# Dockerfile for Vox DPSI Backend
# Works with Render docker runtime (dockerCommand: cd server && node index.js)

FROM node:20-alpine

WORKDIR /app

# Copy server files into server/ subdirectory
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

COPY server/ ./server/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Default CMD (overridden by Render dockerCommand)
CMD ["node", "index.js"]
