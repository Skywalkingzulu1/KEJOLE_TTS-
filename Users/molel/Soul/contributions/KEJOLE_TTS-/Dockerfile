FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . ./

# Expose the port the server runs on (default 3000, adjust if different)
EXPOSE 3000

# Define environment variable for production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
