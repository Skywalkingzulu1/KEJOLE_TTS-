/**
 * Kejoletts TTS Backend
 * Implements secure authentication (JWT) and rate limiting for paid user access.
 *
 * Endpoints (prefixed with /api/v1):
 *   POST   /auth/login      - Obtain JWT token (demo credentials)
 *   GET    /health          - Health check
 *   GET    /voices          - List Google Cloud TTS voices (requires auth)
 *   POST   /synthesize      - Synthesize speech (requires auth)
 *
 * Rate limiting is applied globally and per authenticated user.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Demo user database (replace with real DB in production)
const USERS = [
  {
    id: 1,
    username: 'demo',
    password: 'demo123', // In production, store hashed passwords!
    isPaid: true,
  },
  {
    id: 2,
    username: 'freeuser',
    password: 'free123',
    isPaid: false,
  },
];

// -----------------------------------------------------------------------------
// Express app setup
// -----------------------------------------------------------------------------
const app = express();

app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------------
// Global rate limiter (per IP)
// -----------------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});

app.use(globalLimiter);

// -----------------------------------------------------------------------------
// Helper: Authenticate JWT
// -----------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // { id, username, isPaid }
    next();
  });
}

// -----------------------------------------------------------------------------
// Per‑user rate limiter (applies after authentication)
// -----------------------------------------------------------------------------
function userRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req, res) => (req.user && req.user.isPaid ? 60 : 20), // paid users get higher quota
    keyGenerator: (req) => req.user ? `user-${req.user.id}` : req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded. Upgrade your plan for higher limits.',
      });
    },
  });
}

// -----------------------------------------------------------------------------
// Auth endpoint (demo only)
// -----------------------------------------------------------------------------
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    isPaid: user.isPaid,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ token });
});

// -----------------------------------------------------------------------------
// Health check (no auth)
// -----------------------------------------------------------------------------
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// Google Cloud TTS client
// -----------------------------------------------------------------------------
const ttsClient = new TextToSpeechClient();

// -----------------------------------------------------------------------------
// Voices endpoint (requires auth)
// -----------------------------------------------------------------------------
app.get(
  '/api/v1/voices',
  authenticateToken,
  userRateLimiter(),
  async (req, res) => {
    try {
      const [result] = await ttsClient.listVoices({});
      res.json({ voices: result.voices });
    } catch (err) {
      console.error('Error fetching voices:', err);
      res.status(500).json({ error: 'Failed to retrieve voices' });
    }
  }
);

// -----------------------------------------------------------------------------
// Synthesize endpoint (requires auth)
// -----------------------------------------------------------------------------
app.post(
  '/api/v1/synthesize',
  authenticateToken,
  userRateLimiter(),
  async (req, res) => {
    const { text, languageCode = 'en-US', voiceName } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text field is required' });
    }

    // Build the request
    const request = {
      input: { text },
      // Use provided voiceName or default to first matching voice
      voice: voiceName
        ? { languageCode, name: voiceName }
        : { languageCode, ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    try {
      const [response] = await ttsClient.synthesizeSpeech(request);
      // Return audio content as base64 string
      const audioContent = response.audioContent.toString('base64');
      res.json({ audioContent, encoding: 'base64' });
    } catch (err) {
      console.error('Synthesis error:', err);
      res.status(500).json({ error: 'Speech synthesis failed' });
    }
  }
);

// -----------------------------------------------------------------------------
// Serve static frontend (if present)
// -----------------------------------------------------------------------------
const staticPath = path.join(__dirname, 'public');
if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath));
}

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});