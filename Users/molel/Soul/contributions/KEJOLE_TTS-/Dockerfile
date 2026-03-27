FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# ---------- Runtime Stage ----------
FROM node:18-alpine

WORKDIR /app

# Copy node_modules and application files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Set a default port; can be overridden at runtime via environment variable
ENV PORT=3000
EXPOSE 3000

# Create a non‑root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the application
CMD ["npm", "start"]
