# ------------------------------------------------------------
# Multi‑stage Dockerfile for the Kejoletts TTS server & front‑end
# ------------------------------------------------------------

# ---------- Builder stage ----------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install only production dependencies
# (package-lock.json is optional – npm ci will ignore it if missing)
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# ---------- Runtime stage ----------
FROM node:18-alpine

# Use a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
WORKDIR /app

# Copy built artefacts from the builder stage
COPY --from=builder /app /app

# Expose the port the server listens on (adjust if different)
EXPOSE 3000

# Use the production‑ready startup script
COPY start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Default command
CMD ["sh", "/usr/local/bin/start.sh"]