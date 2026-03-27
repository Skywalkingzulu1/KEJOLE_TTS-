FROM node:18-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm ci --only=production

# Copy application source
COPY . ./

# Expose the port the server runs on (default 3000 as per typical Express apps)
EXPOSE 3000

# Use a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the server
CMD ["npm", "start"]