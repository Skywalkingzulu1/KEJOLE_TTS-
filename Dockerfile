# ------------------------------------------------------------
# Production‑ready Dockerfile for the Kejoletts Text‑to‑Speech API
# ------------------------------------------------------------

# ---------- Builder Stage ----------
# Use a lightweight Node.js LTS image to install dependencies
FROM node:18-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy only the package manifest files first to leverage Docker cache
COPY package.json ./
# If a lock file exists it will be copied; otherwise this line is ignored
COPY package-lock.json* ./

# Install production dependencies (no dev dependencies)
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# ---------- Runtime Stage ----------
# Use a clean Node.js runtime image
FROM node:18-alpine

# Set environment variables for a secure, production run
ENV NODE_ENV=production
ENV PORT=3000

# Create and set the working directory
WORKDIR /app

# Bring in the compiled / installed artefacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Expose the port the server will listen on (adjust if your server uses a different port)
EXPOSE 3000

# Use the npm start script defined in package.json to launch the server
CMD ["npm", "start"]