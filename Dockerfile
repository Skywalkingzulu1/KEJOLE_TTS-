# Use official Node.js LTS image with Debian for apt-get
FROM node:18-bullseye

# Install Python and pip for any Python dependencies
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json if present
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Python dependencies if requirements.txt exists
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the server runs on (default 3000, adjust if needed)
EXPOSE 3000

# Define environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]