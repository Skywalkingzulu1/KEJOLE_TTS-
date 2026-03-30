// server.js
// Express backend for Kejoletts TTS with input validation and error handling

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // parse JSON bodies

// Rate limiting – keep existing configuration
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Helper: validate synthesis request payload
function validateSynthesisPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a JSON object.');
    return errors;
  }
  const { text, languageCode, voiceName } = body;
  if (typeof text !== 'string' || text.trim().length === 0) {
    errors.push('"text" is required and must be a non‑empty string.');
  }
  if (typeof languageCode !== 'string' || languageCode.trim().length === 0) {
    errors.push('"languageCode" is required and must be a non‑empty string.');
  }
  if (typeof voiceName !== 'string' || voiceName.trim().length === 0) {
    errors.push('"voiceName" is required and must be a non‑empty string.');
  }
  return errors;
}

// Synthesize endpoint with validation and error handling
app.post('/api/v1/synthesize', async (req, res) => {
  try {
    const validationErrors = validateSynthesisPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const { text, languageCode, voiceName } = req.body;

    const client = new TextToSpeechClient();
    const request = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    // response.audioContent is a Buffer
    const audioContent = response.audioContent.toString('base64');
    res.status(200).json({ audioContent, encoding: 'base64' });
  } catch (err) {
    console.error('Error in /api/v1/synthesize:', err);
    // Distinguish Google API errors (e.g., invalid language/voice) from server errors
    if (err.code && typeof err.code === 'number') {
      return res.status(400).json({ error: err.message || 'Invalid request parameters.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Generic 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler (fallback)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => {
  console.log(`Kejoletts TTS backend listening on port ${port}`);
});
