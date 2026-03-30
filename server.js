/**
 * server.js
 * Main entry point for the Kejoletts TTS backend.
 * Implements JWT based authentication and rate limiting.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

// Google Cloud TTS client (placeholder – actual implementation can be added later)
const textToSpeech = require('@google-cloud/text-to-speech');

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const SALT_ROUNDS = 10;

// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 429,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// -----------------------------------------------------------------------------
// Express App Setup
// -----------------------------------------------------------------------------
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// In‑memory user store (for demo purposes)
// -----------------------------------------------------------------------------
/**
 * In a real‑world scenario you would query a database.
 * Here we create a single demo user:
 *   username: demo
 *   password: password123
 */
const demoUser = {
  username: 'demo',
  // bcrypt hash of 'password123'
  passwordHash: '$2a$10$KIX/6VhZcVhZcVhZcVhZcO6cVhZcVhZcVhZcVhZcVhZcVhZcVhZcW',
};

// -----------------------------------------------------------------------------
// Helper: JWT Authentication Middleware
// -----------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// Health check – no auth required
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Login – returns JWT on successful authentication
app.post('/api/v1/login', async (req, res) => {
  const { username, password } = req.body;

  // Simple validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Verify user (demo only)
  if (username !== demoUser.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = await bcrypt.compare(password, demoUser.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT
  const token = jwt.sign({ username: demoUser.username }, JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token });
});

// Protected route – list available voices (stub implementation)
app.get('/api/v1/voices', authenticateToken, async (req, res) => {
  // In a real implementation you would call Google Cloud TTS here.
  // For now we return a static example.
  const voices = [
    { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
    { languageCode: 'en-GB', name: 'en-GB-Wavenet-A' },
  ];
  res.json({ voices });
});

// Protected route – synthesize speech (stub implementation)
app.post('/api/v1/synthesize', authenticateToken, async (req, res) => {
  const { text, languageCode, voiceName } = req.body;

  if (!text || !languageCode || !voiceName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Placeholder: In production you would invoke Google Cloud TTS.
  // Here we simply echo back the request for demonstration.
  res.json({
    message: 'Synthesis request received (stub).',
    request: { text, languageCode, voiceName },
  });
});

// Fallback – serve index.html for any unknown routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});