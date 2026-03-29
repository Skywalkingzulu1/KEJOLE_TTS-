# ------------------------------------------------------------
# Dockerfile for Kejoletts TTS Node.js backend
# ------------------------------------------------------------
# Use the official Node.js LTS image (Alpine for small size)
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# ------------------------------------------------------------
# Install production dependencies
# ------------------------------------------------------------
# Copy only package.json (and package-lock.json if present) first
COPY package.json ./
# If a lock file exists in the repo it will be copied; otherwise this line is ignored
COPY package-lock.json ./

# Install dependencies; use npm ci for reproducible builds when lock file exists
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# ------------------------------------------------------------
# Copy application source code
# ------------------------------------------------------------
COPY . .

# ------------------------------------------------------------
# Expose the port the app runs on (default defined in server.js)
# ------------------------------------------------------------
EXPOSE 3000

# ------------------------------------------------------------
# Health‑check endpoint
# ------------------------------------------------------------
# The backend provides a GET /health endpoint that returns 200 OK.
# This health‑check will be used by Docker/Kubernetes to verify container health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# ------------------------------------------------------------
# Runtime command
# ------------------------------------------------------------
# Use the npm start script defined in package.json
CMD ["npm", "start"]