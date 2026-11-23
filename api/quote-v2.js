const SYSTEM = `You are an assistant to a smash repair estimator. From the photos and description, list the repair operations as estimating line items.
Use shop wording: L/H, R/H, F, R, in capitals (e.g. "L/H/F DOOR").
- Parts, remove + refit, repair, paint: one line per panel or operation. Labour lines use hours, not dollars.
- Parts are their own lines with an estimated price or null.
- Give every line a confidence of low, med or high.
- If the photos do not look like the stated vehicle, set photo_matches_vehicle to false.
- Put possible hidden damage only in possible_additional_damage.
- Never total the job. Totals are calculated elsewhere.`;

const line = (extra = {}) => ({
  type: 'array',
  items: {
    type: 'object',
    properties: { description: { type: 'string' }, confidence: { type: 'string', enum: ['low', 'med', 'high'] }, ...extra },
    required: ['description'],
  },
});

const estimateTool = {
  name: 'submit_estimate',
  description: 'Submit the repair estimate as line items.',
  input_schema: {
    type: 'object',
    properties: {
      photo_matches_vehicle: { type: 'boolean' },
      parts: line({ condition: { type: 'string' }, qty: { type: 'number' }, est_price: { type: ['number', 'null'] } }),
      remove_refit: line({ hours: { type: 'number' } }),
      repair: line({ hours: { type: 'number' } }),
      paint: line({ hours: { type: 'number' } }),
      possible_additional_damage: {
        type: 'array',
        items: {
          type: 'object',
          properties: { item: { type: 'string' }, reason: { type: 'string' }, likelihood: { type: 'string' }, est_cost_range: { type: 'string' } },
        },
      },
      estimator_notes: { type: 'string' },
    },
    required: ['photo_matches_vehicle', 'parts', 'remove_refit', 'repair', 'paint'],
  },
};

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
        system: SYSTEM,
        tools: [estimateTool],
        tool_choice: { type: 'tool', name: 'submit_estimate' },
        messages: [{ role: 'user', content }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed.' });
    const block = (j.content || []).find((b) => b.type === 'tool_use');
    if (!block) return res.status(502).json({ error: 'The AI did not return an estimate. Try again.' });
    if (j.stop_reason === 'max_tokens') return res.status(502).json({ error: 'The answer was cut off (too long). Try again.' });
    return res.status(200).json(block.input);
  } catch (e) {
    return res.status(500).json({ error: 'Server error: ' + String(e.message || e).slice(0, 150) });
  }
}
