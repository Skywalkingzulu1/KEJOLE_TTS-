require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting: 60 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Simple login endpoint to obtain JWT
app.post('/api/v1/login', (req, res) => {
  const { username, password } = req.body;
  const VALID_USER = process.env.API_USER || 'admin';
  const VALID_PASS = process.env.API_PASS || 'password';

  if (username === VALID_USER && password === VALID_PASS) {
    const payload = { username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// Protected health check
app.get('/api/v1/health', authenticateToken, (req, res) => {
  res.json({ status: 'ok' });
});

// Protected endpoint: list available voices
app.get('/api/v1/voices', authenticateToken, async (req, res) => {
  const client = new TextToSpeechClient();
  try {
    const [result] = await client.listVoices({});
    res.json(result.voices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected endpoint: synthesize speech
app.post('/api/v1/synthesize', authenticateToken, async (req, res) => {
  const { text, languageCode = 'en-US', voiceName } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text field is required' });
  }

  const client = new TextToSpeechClient();
  const request = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    const audioBase64 = response.audioContent.toString('base64');
    res.json({ audioContent: audioBase64 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend files (index.html and assets)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});