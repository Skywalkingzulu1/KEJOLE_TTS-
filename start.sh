#!/bin/sh
# ------------------------------------------------------------
# Production‑ready startup script for Kejoletts TTS server
# ------------------------------------------------------------

set -e

# Ensure we are in the application directory
cd /app

# (Re‑install production deps in case the image was built without them)
npm ci --only=production

# Start the Node server
exec node server.js