FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package.json ./
# If a lock file exists, copy it as well (optional)
COPY package-lock.json ./
RUN npm ci --only=production

# Copy application source code
COPY . ./

# Expose the port the server listens on (default 3000)
EXPOSE 3000

# Default environment variables (can be overridden at runtime)
ENV PORT=3000
# Path to Google Cloud credentials if used; set at runtime if needed
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

# Run as a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the Node.js server
CMD ["npm", "start"]