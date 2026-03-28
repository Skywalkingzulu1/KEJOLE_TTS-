/**
 * Kejoletts Text‑to‑Speech Backend
 * -------------------------------------------------
 * Implements a robust /tts endpoint with thorough input validation,
 * comprehensive error handling and production‑ready safeguards.
 *
 * Author: Andile Sizophila Mchunu
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const textToSpeech = require('@google-cloud/text-to-speech');

// Initialise Express app
const app = express();
app.use(express.json({ limit: '1mb' })); // Guard against huge payloads
app.use(cors());

// Rate limiting – 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Initialise Google Cloud TTS client
const ttsClient = new textToSpeech.TextToSpeechClient();

/**
 * Helper: Validate incoming TTS request payload.
 * Returns an object { valid: boolean, errors: string[], data: object }
 */
function validateTtsPayload(payload) {
  const errors = [];
  const data = {};

  // ---- text (required) ----
  if (typeof payload.text !== 'string' || payload.text.trim() === '') {
    errors.push('`text` must be a non‑empty string.');
  } else {
    data.text = payload.text.trim();
  }

  // ---- languageCode (optional) ----
  if (payload.languageCode !== undefined) {
    if (typeof payload.languageCode !== 'string' || payload.languageCode.trim() === '') {
      errors.push('`languageCode` must be a non‑empty string if provided.');
    } else {
      data.languageCode = payload.languageCode.trim();
    }
  } else {
    data.languageCode = 'en-US';
  }

  // ---- voiceName (optional) ----
  if (payload.voiceName !== undefined) {
    if (typeof payload.voiceName !== 'string' || payload.voiceName.trim() === '') {
      errors.push('`voiceName` must be a non‑empty string if provided.');
    } else {
      data.voiceName = payload.voiceName.trim();
    }
  }

  // ---- ssmlGender (optional) ----
  const allowedGenders = ['MALE', 'FEMALE', 'NEUTRAL'];
  if (payload.ssmlGender !== undefined) {
    if (typeof payload.ssmlGender !== 'string' ||
        !allowedGenders.includes(payload.ssmlGender.toUpperCase())) {
      errors.push('`ssmlGender` must be one of: MALE, FEMALE, NEUTRAL.');
    } else {
      data.ssmlGender = payload.ssmlGender.toUpperCase();
    }
  } else {
    data.ssmlGender = 'NEUTRAL';
  }

  // ---- speakingRate (optional) ----
  if (payload.speakingRate !== undefined) {
    const rate = Number(payload.speakingRate);
    if (Number.isNaN(rate) || rate < 0.25 || rate > 4.0) {
      errors.push('`speakingRate` must be a number between 0.25 and 4.0.');
    } else {
      data.speakingRate = rate;
    }
  } else {
    data.speakingRate = 1.0;
  }

  // ---- pitch (optional) ----
  if (payload.pitch !== undefined) {
    const pitch = Number(payload.pitch);
    if (Number.isNaN(pitch) || pitch < -20 || pitch > 20) {
      errors.push('`pitch` must be a number between -20 and 20.');
    } else {
      data.pitch = pitch;
    }
  } else {
    data.pitch = 0.0;
  }

  // ---- audioEncoding (optional) ----
  const allowedEncodings = ['MP3', 'OGG_OPUS', 'LINEAR16'];
  if (payload.audioEncoding !== undefined) {
    if (typeof payload.audioEncoding !== 'string' ||
        !allowedEncodings.includes(payload.audioEncoding.toUpperCase())) {
      errors.push('`audioEncoding` must be one of: MP3, OGG_OPUS, LINEAR16.');
    } else {
      data.audioEncoding = payload.audioEncoding.toUpperCase();
    }
  } else {
    data.audioEncoding = 'MP3';
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  };
}

/**
 * POST /tts
 * Expects JSON payload with at least a `text` field.
 * Returns base64‑encoded audio content.
 */
app.post('/tts', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateTtsPayload(req.body);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid request payload.', details: errors });
    }

    const request = {
      input: { text: data.text },
      voice: {
        languageCode: data.languageCode,
        ssmlGender: data.ssmlGender,
        ...(data.voiceName && { name: data.voiceName }),
      },
      audioConfig: {
        audioEncoding: data.audioEncoding,
        speakingRate: data.speakingRate,
        pitch: data.pitch,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response || !response.audioContent) {
      // This should never happen, but guard against it.
      throw new Error('Empty response from Google Cloud TTS.');
    }

    // Send base64 string to client
    res.json({ audioContent: response.audioContent.toString('base64') });
  } catch (err) {
    // Log the error with stack trace for debugging
    console.error('Error in /tts handler:', err);
    // Pass to global error handler
    next(err);
  }
});

/**
 * Global error handling middleware.
 * Guarantees a JSON response for any uncaught errors.
 */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error.' : err.message;
  res.status(status).json({ error: message });
});

/**
 * Health‑check endpoint – useful for orchestration platforms.
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Start the server.
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kejoletts TTS service listening on port ${PORT}`);
});