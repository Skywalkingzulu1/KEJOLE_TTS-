# Use the official Node.js LTS image (Alpine for a small footprint)
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package definition files and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Expose the port that the Express server listens on (default 3000)
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "run", "start"]