// server.js
// Express backend for Kejoletts TTS with JWT authentication and rate limiting

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Middleware
app.use(cors());
app.use(express.json());

// Global rate limiter – 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Simple in‑memory user store (for demo purposes only)
const USERS = {
  // username: password (plain text for demo – replace with hashed passwords in production)
  'demoUser': 'demoPass',
};

// Helper to generate JWT
function generateToken(username) {
  return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = payload.sub;
    next();
  });
}

// Login endpoint – issues JWT on valid credentials
app.post('/api/v1/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const storedPass = USERS[username];
  if (!storedPass || storedPass !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(username);
  res.json({ token, expiresIn: JWT_EXPIRES_IN });
});

// Google Cloud TTS client – expects GOOGLE_APPLICATION_CREDENTIALS env var
const ttsClient = new TextToSpeechClient();

// Protected routes – require JWT
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);

// Health check – open (no auth) but still rate limited
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// List voices
protectedRouter.get('/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    const voices = result.voices.map(v => ({
      name: v.name,
      languageCodes: v.languageCodes,
      ssmlGender: v.ssmlGender,
    }));
    res.json({ voices });
  } catch (err) {
    console.error('Error listing voices:', err);
    res.status(500).json({ error: 'Failed to list voices' });
  }
});

// Synthesize speech
protectedRouter.post('/synthesize', async (req, res) => {
  const { text, languageCode, voiceName } = req.body;
  if (!text || !languageCode || !voiceName) {
    return res.status(400).json({ error: 'Missing required fields: text, languageCode, voiceName' });
  }
  const request = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3' },
  };
  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    res.json({ audioContent }); // client can decode base64 to audio/mp3
  } catch (err) {
    console.error('Synthesis error:', err);
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

// Mount protected routes under /api/v1
app.use('/api/v1', protectedRouter);

// Serve static frontend (index.html and assets) if present
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')));
});

app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});
