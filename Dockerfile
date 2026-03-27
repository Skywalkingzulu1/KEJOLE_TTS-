# Use the official Node.js LTS image as the base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json (and package-lock.json if present) to the working directory
COPY package.json ./
# If a package-lock.json exists in the repo, uncomment the next line to copy it as well
# COPY package-lock.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application source code into the container
COPY . .

# Expose the port that the Node.js server listens on (default 3000, adjust if needed)
EXPOSE 3000

# Set environment to production for optimal performance
ENV NODE_ENV=production

# Define the command to run the application
CMD ["npm", "start"]