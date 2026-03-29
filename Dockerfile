# ------------------------------------------------------------
# Dockerfile for Kejoletts TTS (KEJOLE_TTS) backend
# ------------------------------------------------------------
# Base image: Node.js LTS (Alpine for small footprint)
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy only the package manifest files first to leverage Docker cache
COPY package.json ./
# If a lock file exists in the repo, uncomment the line below
# COPY package-lock.json ./

# Install production dependencies (no dev deps)
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Expose the port the Express server listens on (default 3000)
EXPOSE 3000

# Set environment to production by default
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]