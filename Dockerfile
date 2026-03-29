# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package metadata and install production dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the server listens on (default 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
