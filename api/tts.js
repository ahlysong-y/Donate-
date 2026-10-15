export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const text = (req.query && req.query.text) || '';
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    const cleanText = text.trim();
    // Google TTS limit is ~180 chars. Split text into chunks if needed
    const chunks = [];
    if (cleanText.length <= 180) {
      chunks.push(cleanText);
    } else {
      const words = cleanText.split(/([\s,!?]+)/);
      let current = '';
      for (const word of words) {
        if ((current + word).length <= 180) {
          current += word;
        } else {
          if (current.trim()) chunks.push(current.trim());
          current = word;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }

    const audioBuffers = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=km&client=tw-ob`;

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        console.error('Google TTS upstream error:', response.status);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    if (audioBuffers.length === 0) {
      return res.status(502).json({ error: 'Failed to fetch TTS audio from upstream' });
    }

    const combined = Buffer.concat(audioBuffers);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(combined);
  } catch (err) {
    console.error('TTS handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
