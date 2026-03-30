// server.js
// Main backend for Kejoletts TTS with JWT authentication and rate limiting

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Initialise Google Cloud TTS client (expects GOOGLE_APPLICATION_CREDENTIALS env var)
const ttsClient = new TextToSpeechClient();

// Middleware
app.use(cors());
app.use(express.json());

// ---------- JWT Authentication Middleware ----------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[0] === 'Bearer' ? authHeader.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // attach decoded payload
    next();
  });
}

// ---------- Rate Limiting Middleware ----------
// Limit each user (or IP if unauthenticated) to 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => {
    // Prefer authenticated user ID, fallback to IP address
    return (req.user && req.user.id) ? req.user.id : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

// Apply rate limiter and auth to all API routes under /api/v1
app.use('/api/v1', authenticateToken, apiLimiter);

// ---------- Helper: Issue JWT (simple login) ----------
// In a real deployment replace with proper user store & password hashing.
app.post('/api/v1/login', (req, res) => {
  const { username, password } = req.body;
  // Very basic static credentials for demo purposes
  if (username === 'admin' && password === 'password') {
    const payload = { id: username, role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// ---------- API Endpoints ----------

// Health check (no auth needed, expose separately)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// List available voices
app.get('/api/v1/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    const voices = result.voices || [];
    res.json({ voices });
  } catch (err) {
    console.error('Error listing voices:', err);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
});

// Synthesize speech
app.post('/api/v1/synthesize', async (req, res) => {
  const { text, languageCode = 'en-US', voiceName } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }

  const request = {
    input: { text },
    // Select the language and voice. If voiceName not provided, let API pick default.
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    // Log usage for tracking (could be persisted to DB in real app)
    console.log(`User ${req.user.id} synthesized text of length ${text.length}`);
    res.json({ audioContent });
  } catch (err) {
    console.error('Synthesis error:', err);
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

// Fallback route for undefined endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});
