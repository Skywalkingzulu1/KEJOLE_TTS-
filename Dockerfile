# Use an official Node runtime as a parent image
FROM node:18-alpine AS base

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if present) first to leverage Docker cache
COPY package.json ./
# If a package-lock.json exists, uncomment the next line
# COPY package-lock.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy the rest of the application source code
COPY . .

# Expose the port that the server will run on (adjust if your server uses a different port)
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]