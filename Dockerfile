# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json (and package-lock.json if present)
COPY package.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . ./

# Expose the port the app runs on (default for Express is 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
