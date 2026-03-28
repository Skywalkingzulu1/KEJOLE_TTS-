require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Initialise Google Cloud TTS client
const ttsClient = new TextToSpeechClient();

// POST /api/tts endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      languageCode = 'en-US',
      voiceName,
      ssmlGender = 'NEUTRAL',
      audioEncoding = 'MP3',
    } = req.body;

    // Validate payload
    if (!text) {
      return res.status(400).json({ error: 'Missing "text" field in request body.' });
    }

    // Build the request for Google TTS
    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
        ssmlGender,
      },
      audioConfig: { audioEncoding },
    };

    // Call the TTS API
    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    if (!audioContent) {
      throw new Error('No audio content returned from TTS service.');
    }

    // Prepare response headers for audio streaming / download
    const filename = `tts_${Date.now()}.${audioEncoding.toLowerCase()}`;
    const contentType = audioEncoding === 'MP3' ? 'audio/mpeg' : 'audio/wav';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });

    // Send the audio buffer (Google returns base64 string)
    res.send(Buffer.from(audioContent, 'base64'));
  } catch (error) {
    console.error('TTS processing error:', error);
    res.status(500).json({
      error: 'Failed to synthesize speech.',
      details: error.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kejoletts TTS backend listening on port ${PORT}`);
});