// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'change_this_secret';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting – 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Simple login to obtain JWT (in production replace with proper user validation)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Placeholder validation – accept any non‑empty credentials
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required.' });
  }
  const token = jwt.sign({ sub: username }, jwtSecret, { expiresIn: '1h' });
  res.json({ token });
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Google Cloud TTS client
const ttsClient = new TextToSpeechClient();

// Protected API routes
const apiRouter = express.Router();
apiRouter.use(authenticateToken);

// Health check
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// List voices
apiRouter.get('/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    res.json(result.voices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch voices' });
  }
});

// Synthesize speech
apiRouter.post('/synthesize', async (req, res) => {
  const { text, languageCode, voiceName } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const request = {
    input: { text },
    voice: {
      languageCode: languageCode || 'en-US',
      name: voiceName || 'en-US-Wavenet-D',
    },
    audioConfig: { audioEncoding: 'MP3' },
  };
  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    res.json({ audioContent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Synthesis failed' });
  }
});

app.use('/api/v1', apiRouter);

// Serve static frontend (index.html and assets) if present
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
