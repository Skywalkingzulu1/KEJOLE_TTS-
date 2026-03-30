/**
 * Kejoletts TTS Backend
 * Implements secure API key authentication, rate limiting, and Google Cloud TTS integration.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// Load allowed API keys from environment (comma‑separated)
const API_KEYS = (process.env.API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

// Simple API‑key authentication middleware
function authenticateApiKey(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
  let token = null;

  if (authHeader) {
    // Support "Bearer <key>" or raw key
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  if (!token || !API_KEYS.includes(token)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  // Attach the key to request for downstream use (e.g., per‑key rate limiting)
  req.apiKey = token;
  next();
}

// Rate limiter – 60 requests per minute per API key
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req) => req.apiKey || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

// Apply authentication and rate limiting to all /api/v1 routes
app.use('/api/v1', authenticateApiKey, limiter);

// ---------- Google Cloud TTS Client ----------
const ttsClient = new TextToSpeechClient();

// ---------- Routes ----------
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/voices', async (req, res) => {
  try {
    const [result] = await ttsClient.listVoices({});
    const voices = result.voices.map(v => ({
      name: v.name,
      languageCodes: v.languageCodes,
      ssmlGender: v.ssmlGender,
      naturalSampleRateHertz: v.naturalSampleRateHertz,
    }));
    res.json({ voices });
  } catch (err) {
    console.error('Error fetching voices:', err);
    res.status(500).json({ error: 'Failed to retrieve voices' });
  }
});

app.post('/api/v1/synthesize', async (req, res) => {
  const { text, languageCode = 'en-US', voiceName } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }

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
    const audioContent = response.audioContent;

    // Return audio as base64 string
    const base64Audio = Buffer.from(audioContent).toString('base64');
    res.json({ audioContent: base64Audio });
  } catch (err) {
    console.error('TTS synthesis error:', err);
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

// ---------- Static Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Kejoletts TTS server running on port ${PORT}`);
});