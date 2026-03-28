// server.js
// Express backend for Google Cloud Text-to-Speech synthesis
// Author: Andile Sizophila Mchunu

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Initialize Google Cloud TTS client
const ttsClient = new TextToSpeechClient();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * POST /synthesize
 * Body JSON:
 * {
 *   "text": "Hello world",
 *   "languageCode": "en-US",          // optional, default en-US
 *   "voiceName": "en-US-Wavenet-D",   // optional
 *   "ssmlGender": "MALE"               // optional: MALE, FEMALE, NEUTRAL, SSML_VOICE_GENDER_UNSPECIFIED
 * }
 *
 * Returns:
 * {
 *   "audioContent": "<base64-encoded audio>"
 * }
 */
app.post('/synthesize', async (req, res) => {
  try {
    const {
      text,
      languageCode = 'en-US',
      voiceName,
      ssmlGender = 'NEUTRAL',
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    // Build the request
    const request = {
      input: { text },
      // Select the language and SSML voice gender (optional voice name)
      voice: {
        languageCode,
        ssmlGender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };

    if (voiceName) {
      request.voice.name = voiceName;
    }

    // Perform the Text-to-Speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    // response.audioContent is a Buffer
    const audioBase64 = response.audioContent.toString('base64');

    res.json({ audioContent: audioBase64 });
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Kejoletts TTS backend listening on port ${port}`);
});