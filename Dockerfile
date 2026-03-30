# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variable
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
