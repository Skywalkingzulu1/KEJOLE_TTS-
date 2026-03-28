FROM node:18-bullseye

WORKDIR /app

# Install Node.js dependencies
COPY package.json ./
RUN npm install

# Install Python and Python dependencies (if needed)
COPY requirements.txt ./
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install --no-cache-dir -r requirements.txt && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . ./

# Expose the port the server runs on (adjust if different)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
