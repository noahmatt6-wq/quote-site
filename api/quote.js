export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  const { password, prompt, images } = req.body || {};
  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  if (!prompt || !Array.isArray(images) || images.length < 1 || images.length > 6) {
    return res.status(400).json({ error: 'Add 1 to 6 photos.' });
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
        max_tokens: 3000,
        messages: [{ role: 'user', content }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed.' });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    const m = text.match(/\{[\s\S]*\}/);
    return res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    return res.status(500).json({ error: 'Could not read the AI response. Try again.' });
  }
}
