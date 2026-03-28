FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (default for this project)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
