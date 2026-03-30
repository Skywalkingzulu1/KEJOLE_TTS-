# ---- Dockerfile ----
# Multi‑stage Dockerfile for building and running the Node.js backend together with the static UI.
# It installs production dependencies, copies the application source, and starts the server.

# ---------- Stage 1: Builder ----------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install only production dependencies (no dev deps)
# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy the rest of the application source (backend code, UI files, etc.)
COPY . .

# ---------- Stage 2: Runtime ----------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy the node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the application source code from the builder stage
COPY --from=builder /app .

# Expose the port the Express server listens on (as defined in the README)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Default command to run the backend server
CMD ["node", "server.js"]
# ----------------------