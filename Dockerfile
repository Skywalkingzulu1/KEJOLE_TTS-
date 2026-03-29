# ---- Builder Stage ----
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package.json ./
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# ---- Production Stage ----
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app .

# Expose the port the app runs on
EXPOSE 3000

# Create a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Ensure production mode
ENV NODE_ENV=production

# Default command
CMD ["npm", "start"]