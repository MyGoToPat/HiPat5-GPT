// server/api/tts.js
// This is a conceptual API route file. You would need to integrate this into your
// chosen backend solution (e.g., a Node.js Express server, or a serverless function
// deployed separately from your frontend).

import fetch from 'node-fetch'; // For Node.js environment

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Read OPENAI_API_KEY from environment variables
    // In a Node.js environment, this would be process.env.OPENAI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables.');
      return res.status(500).json({ error: 'Server configuration error: OpenAI API key missing' });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // Using tts-1 as gpt-4o-mini-tts is not a standard model name for TTS
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI TTS API error:', openaiResponse.status, errorText);
      return res.status(openaiResponse.status).json({ error: 'Failed to generate speech from OpenAI' });
    }

    // Set headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the audio directly to the client
    openaiResponse.body.pipe(res);

  } catch (error) {
    console.error('Error in TTS API route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}