export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  const { password, prompt, images } = req.body || {};
  if (!process.env.APP_PASSWORD) return res.status(500).json({ error: 'APP_PASSWORD is not set on the server.' });
  if (String(password || '').trim() !== process.env.APP_PASSWORD.trim()) return res.status(401).json({ error: 'Wrong password.' });
  if (!prompt || !Array.isArray(images) || images.length < 1 || images.length > 24) {
    return res.status(400).json({ error: 'Add 1 to 24 photos.' });
  }
  const content = images.map((d) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: String(d).replace(/^data:image\/jpeg;base64,/, '') },
  }));
  content.push({ type: 'text', text: String(prompt).slice(0, 20000) });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 8000,
        messages: [{ role: 'user', content }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed.' });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: 'The AI did not return a quote. It said: ' + text.slice(0, 200) });
    try {
      return res.status(200).json(JSON.parse(m[0]));
    } catch (e) {
      const why = j.stop_reason === 'max_tokens' ? 'The answer was cut off (too long).' : 'The answer was not valid JSON.';
      return res.status(502).json({ error: why + ' Try again.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server error: ' + String(e.message || e).slice(0, 150) });
  }
}
