FROM node:20-alpine AS base

# Install Python and pip
RUN apk add --no-cache python3 py3-pip && \
    python3 -m ensurepip && \
    pip3 install --no-cache --upgrade pip

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if present) and install Node dependencies
COPY package.json ./
RUN npm ci --only=production

# Copy Python requirements and install them
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code (backend and static front‑end files)
COPY . ./

# Build stage for static assets (optional – if a build step is needed, add here)
# For this simple project we serve the static files directly via Express or a static server.

# Expose the port the Node server listens on (default 3000, adjust if needed)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Define the entrypoint to start the backend server
CMD ["npm", "start"]