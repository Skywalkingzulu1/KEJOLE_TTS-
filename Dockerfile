# Use the official Node.js LTS image as the base
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package definition files and install only production dependencies
COPY package.json ./
# If a package-lock.json exists it will be copied as well (optional)
# COPY package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the application source code (server, front‑end, etc.)
COPY . ./

# Expose the port that the Express server listens on (default 3000)
EXPOSE 3000

# Set environment to production for Node
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
