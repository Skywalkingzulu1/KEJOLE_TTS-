# Use the official Node.js LTS image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json (and package-lock.json if present) to install dependencies
COPY package.json ./
# If a package-lock.json exists in the repo, it will be copied automatically by the wildcard below
# COPY package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Expose the port that the Express server listens on (default 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Define the command to run the application
CMD ["npm", "start"]