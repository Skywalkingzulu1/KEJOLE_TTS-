// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Global rate limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, process.env.AUTH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Token generation endpoint (simple client credential flow)
app.post('/api/v1/token', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (
    clientId !== process.env.CLIENT_ID ||
    clientSecret !== process.env.CLIENT_SECRET
  ) {
    return res.status(401).json({ error: 'Invalid client credentials' });
  }

  const payload = { clientId };
  const token = jwt.sign(payload, process.env.AUTH_SECRET, { expiresIn: '1h' });
  res.json({ token, expiresIn: 3600 });
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize Google Cloud TTS client
const ttsClient = new TextToSpeechClient();

// Protected synthesize endpoint
app.post('/api/v1/synthesize', authenticateToken, async (req, res) => {
  const { text, languageCode, voiceName } = req.body;
  if (!text || !languageCode || !voiceName) {
    return res.status(400).json({ error: 'Missing required fields: text, languageCode, voiceName' });
  }

  const request = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    res.json({ audioContent, encoding: 'base64' });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Kejoletts TTS backend listening on port ${port}`);
});
