require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Google TTS client
const ttsClient = new TextToSpeechClient();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// In‑memory user store (for demo purposes)
let users = []; // { id, email, passwordHash, role, subscription }

// Helper functions
function generateToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    subscription: user.subscription,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function subscriptionMiddleware(req, res, next) {
  if (!req.user.subscription) {
    return res.status(403).json({ error: 'Active subscription required' });
  }
  next();
}

// Routes

// Registration
app.post('/api/v1/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    email,
    passwordHash,
    role: 'user',
    subscription: false,
  };
  users.push(newUser);
  const token = generateToken(newUser);
  res.status(201).json({ token });
});

// Login
app.post('/api/v1/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res.json({ token });
});

// Subscription management (simple toggle for demo)
app.post('/api/v1/subscribe', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.subscription = true; // In real world, integrate with payment provider
  const newToken = generateToken(user);
  res.json({ message: 'Subscription activated', token: newToken });
});

// Protected TTS endpoint
app.post('/api/v1/synthesize', authMiddleware, subscriptionMiddleware, async (req, res) => {
  const { text, languageCode = 'en-US', voiceName = 'en-US-Wavenet-D' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const request = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent.toString('base64');
    res.json({ audioContent });
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static frontend (index.html and assets)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});