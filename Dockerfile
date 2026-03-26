# ---------- Build Stage ----------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --production

# Copy application source code (including front‑end files)
COPY . ./

# ---------- Runtime Stage ----------
FROM node:18-alpine

# Create a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built artifacts from the builder stage
COPY --from=builder /app .

# Change ownership to the non‑root user
RUN chown -R appuser:appgroup /app

# Switch to non‑root user
USER appuser

# Expose ports: 3000 for the API server, 80 for static front‑end (if served via a reverse proxy)
EXPOSE 3000 80

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]