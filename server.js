require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Simple API‑key authentication
const API_KEY = process.env.API_KEY || 'changeme';
function authMiddleware(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/tts – synthesize speech
app.post('/api/tts', authMiddleware, async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid request: "text" field is required.' });
  }

  const client = new TextToSpeechClient();

  const request = {
    input: { text },
    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent; // Buffer

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="speech.mp3"',
    });
    res.send(audioContent);
  } catch (err) {
    console.error('Text‑to‑Speech error:', err);
    res.status(500).json({ error: 'Failed to synthesize speech.' });
  }
});

// Global error handler (fallback)
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kejoletts TTS service listening on port ${PORT}`);
});