export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { address } = req.body || {};
  if (!address) return res.status(400).json({ error: 'address required' });

  const GMAPS_KEY = process.env.GOOGLE_MAPS_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!GMAPS_KEY || !ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'Missing API keys in environment' });
  }

  try {
    // Pull 3 Street View angles for better coverage
    const angles = [180, 225, 270];
    const images = [];

    for (const heading of angles) {
      const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${encodeURIComponent(address)}&heading=${heading}&pitch=15&fov=90&key=${GMAPS_KEY}`;
      const imgRes = await fetch(svUrl);
      if (!imgRes.ok) continue;
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      images.push({ type: 'image', source: { type: 'base64', media_type: contentType, data: b64 } });
    }

    if (!images.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'No Street View imagery available for this address.', address });
    }

    // Build message with all images + prompt
    const content = [
      ...images,
      {
        type: 'text',
        text: `You are an expert roofing sales analyst for a door-to-door roofing company in the Raleigh, NC area. You are looking at Street View images of a home.

Analyze the ROOF ONLY. Score it for door-to-door roofing sales outreach:

HOT — High priority. Visible signs of serious wear or damage: dark algae/moss streaking, missing or lifted shingles, obvious granule loss, sagging sections, visible storm damage. Roof age looks 15–25+ years. Knock this door first.

WARM — Worth pursuing. Some visible wear, aging shingles, minor streaking, or roof looks like it's approaching end of life in the next few years. Worth a knock.

PASS — Skip for now. Roof looks newer or recently replaced. No visible issues. Not a good prospect.

SKIP — Cannot assess. Roof is obscured by trees, wrong angle, or image quality too low to evaluate.

Respond ONLY with valid JSON, nothing else:
{"score":"hot|warm|pass|skip","confidence":"high|medium|low","reasoning":"One or two sentences describing exactly what you saw on the roof that led to this score."}`
      }
    ];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content }]
      })
    });

    const claudeData = await claudeRes.json();
    if (!claudeRes.ok) throw new Error(claudeData.error?.message || 'Claude API error');

    const raw = claudeData.content?.[0]?.text || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { score: 'skip', confidence: 'low', reasoning: raw }; }

    return res.status(200).json({ ...parsed, address });

  } catch (err) {
    console.error('score-roof error:', err);
    return res.status(500).json({ error: err.message });
  }
}
