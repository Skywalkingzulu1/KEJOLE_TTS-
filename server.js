require('dotenv').config();
const express = require('express');
const cors = require('cors');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Text-to-Speech client
const client = new textToSpeech.TextToSpeechClient();

app.post('/api/tts', async (req, res) => {
  const {
    text,
    languageCode = 'en-US',
    voiceName,
    ssmlGender = 'NEUTRAL',
  } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing "text" field in request body.' });
  }

  const request = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
      ssmlGender,
    },
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
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({ error: 'Failed to synthesize speech.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS backend listening on port ${PORT}`);
});