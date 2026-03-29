# ------------------------------------------------------------
# Multi-stage Dockerfile for KEJOLE_TTS Node.js backend
# ------------------------------------------------------------

# ---------- Builder Stage ----------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install only production dependencies first (helps caching)
COPY package.json ./
# If a package-lock.json exists, copy it as well for deterministic installs
# COPY package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# ---------- Production Stage ----------
FROM node:18-alpine

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Set working directory
WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./
# If there are other source files needed (e.g., routes, utils), copy them as well
COPY --from=builder /app/*.js ./
COPY --from=builder /app/*.json ./
COPY --from=builder /app/*.env ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/views ./views

# Expose the port the server listens on (default from README)
EXPOSE 3000

# Define the entrypoint
ENTRYPOINT ["node", "server.js"]