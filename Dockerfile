# Use official Node LTS image for the build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package definition and install only production dependencies
COPY package.json ./
RUN npm ci --only=production

# Copy the rest of the application (backend code, front‑end assets, etc.)
COPY . ./

# -------------------------------------------------
# Production image
FROM node:18-alpine

WORKDIR /app

# Bring in the built artifacts and installed modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Expose the port the server listens on (default defined in server.js, commonly 3000)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
