# Use an official Node.js LTS image for building the application
FROM node:18-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy only the package files first to leverage Docker layer caching
COPY package.json ./
# If a lock file exists in the repository, it should be copied as well:
# COPY package-lock.json ./

# Install only production dependencies (no dev dependencies)
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# ---------------------------------------------------------------------------
# Runtime stage – a minimal image that runs the built application with PM2
# ---------------------------------------------------------------------------
FROM node:18-alpine

# Install PM2 globally to manage the Node.js process
RUN npm install -g pm2

# Set working directory for the runtime container
WORKDIR /app

# Copy the built application and its dependencies from the builder stage
COPY --from=builder /app /app

# Expose the port the server listens on (adjust if your server uses a different port)
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Use PM2's runtime mode to start the server and keep the container alive
# Adjust "server.js" if your entry point file has a different name
CMD ["pm2-runtime", "server.js"]