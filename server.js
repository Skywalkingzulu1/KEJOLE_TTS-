// server.js
// Express server providing a POST /tts endpoint for Text-to-Speech synthesis.
// Returns audio data (MP3 by default) directly in the response body.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');

// Initialize Google Cloud TTS client. It will use credentials from the environment variable GOOGLE_APPLICATION_CREDENTIALS.
const ttsClient = new TextToSpeechClient();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Basic rate limiting: max 60 requests per minute per IP.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/**
 * @api {post} /tts Generate speech audio from plain text
 * @apiName TextToSpeech
 * @apiGroup TTS
 * @apiDescription Accepts a JSON payload with a `text` field (required) and optional parameters to control language, voice, gender, and audio encoding. Returns raw audio data (MP3 by default).
 * @apiParam {String} text The plain‑text to be synthesized.
 * @apiParam {String} [languageCode="en-US"] ISO‑639 language‑country code.
 * @apiParam {String} [voiceName] Specific voice name (overrides languageCode and gender if provided).
 * @apiParam {String} [ssmlGender] "MALE", "FEMALE" or "NEUTRAL". Default: "NEUTRAL".
 * @apiParam {String} [audioEncoding="MP3"] Desired audio encoding. Supported: MP3, LINEAR16 (WAV).
 * @apiSuccess (200) {File} audio Binary audio file.
 * @apiError (400) {String} message Description of the validation error.
 * @apiError (500) {String} message Internal server error.
 */
app.post('/tts', async (req, res) => {
  try {
    const {
      text,
      languageCode = 'en-US',
      voiceName,
      ssmlGender = 'NEUTRAL',
      audioEncoding = 'MP3',
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ message: 'Field "text" is required and must be a non‑empty string.' });
    }

    // Build the request for Google Cloud TTS.
    const request = {
      input: { text },
      // If a specific voiceName is supplied, use it; otherwise use languageCode and gender.
      voice: voiceName
        ? { name: voiceName }
        : { languageCode, ssmlGender },
      audioConfig: { audioEncoding },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    // Determine MIME type based on encoding.
    const mimeType = audioEncoding === 'LINEAR16' ? 'audio/wav' : 'audio/mpeg';
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="speech.${audioEncoding === 'LINEAR16' ? 'wav' : 'mp3'}"`,
      'Content-Length': audioContent.length,
    });
    // Send raw binary.
    res.send(Buffer.from(audioContent, 'base64'));
  } catch (err) {
    console.error('Error during TTS synthesis:', err);
    res.status(500).json({ message: 'Internal server error while generating speech.' });
  }
});

// Health check endpoint.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});
