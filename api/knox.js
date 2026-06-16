export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });
  const system = 'You are Knox, RooFinder AI sales assistant. Qualify contractors, handle objections, push them to Get Access. Product: exclusive zone, pre-qualified homeowner leads, no shared leads, $999 first month then $2500/month. Keep replies 1-3 sentences. Be direct and confident.';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 250, system, messages })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || 'error');
    res.status(200).json({ reply: data.content[0].text });
  } catch(err) { res.status(500).json({ error: err.message }); }
}
