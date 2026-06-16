const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const opts = { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': buf.length } };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('Claude timeout')); });
    req.write(buf);
    req.end();
  });
}

module.exports = async function handler(req, res) {
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
    return res.status(500).json({ error: 'Missing API keys in Vercel env vars' });
  }

  try {
    // Step 1: Geocode
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GMAPS_KEY}`;
    const geoResp = await httpsGet(geoUrl);
    const geoData = JSON.parse(geoResp.buffer.toString());
    if (!geoData.results || !geoData.results.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'Could not locate address.', address, image_count: 0 });
    }
    const { lat, lng } = geoData.results[0].geometry.location;

    // Step 2: Fetch Street View images (4 angles to stay fast)
    const shots = [
      { heading: 0,   pitch: 20, label: 'North' },
      { heading: 90,  pitch: 20, label: 'East'  },
      { heading: 180, pitch: 20, label: 'South' },
      { heading: 270, pitch: 20, label: 'West'  },
      { heading: 45,  pitch: 35, label: 'Roof NE' },
      { heading: 225, pitch: 35, label: 'Roof SW' },
    ];

    const imageResults = await Promise.all(shots.map(async (shot) => {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${lat},${lng}&heading=${shot.heading}&pitch=${shot.pitch}&fov=90&key=${GMAPS_KEY}&return_error_code=true`;
      try {
        const r = await httpsGet(url);
        if (r.status === 404 || r.buffer.length < 5000) return null;
        const b64 = r.buffer.toString('base64');
        return { ...shot, b64 };
      } catch (e) { return null; }
    }));

    const validImages = imageResults.filter(Boolean);
    if (!validImages.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'No Street View imagery for this address.', address, image_count: 0 });
    }

    // Step 3: Send to Claude
    const content = [];
    validImages.forEach((img) => {
      content.push({ type: 'text', text: `[View: ${img.label}]` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 } });
    });
    content.push({ type: 'text', text: `You are an expert roofing sales analyst in Raleigh, NC. You received ${validImages.length} Street View images of a home. Assess the roof condition like an experienced door-to-door rep:\n\nLook for: dark algae/moss streaking, granule loss, curling/missing shingles, sagging roofline, storm damage, age 15+ years, damaged flashing.\n\nSCORE:\nHOT — Multiple clear damage signs. Needs a roof now.\nWARM — Some wear/aging. Worth a knock.\nPASS — New or recently replaced roof.\nSKIP — Can't see roof clearly.\n\nRespond ONLY with valid JSON:\n{"score":"hot|warm|pass|skip","confidence":"high|medium|low","best_angle":"label","reasoning":"2-3 sentences of specific observations"}` });

    const claudeBody = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, messages: [{ role: 'user', content }] });
    const claudeResp = await httpsPost('api.anthropic.com', '/v1/messages', {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }, claudeBody);

    if (claudeResp.status !== 200) throw new Error(`Claude API ${claudeResp.status}: ${claudeResp.body.slice(0,200)}`);
    const claudeData = JSON.parse(claudeResp.body);
    const raw = (claudeData.content && claudeData.content[0] && claudeData.content[0].text || '{}').trim();
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; }
      catch { parsed = { score: 'skip', confidence: 'low', reasoning: raw.slice(0, 200) }; }
    }

    return res.status(200).json({
      ...parsed,
      address, lat, lng,
      image_count: validImages.length,
      previews: validImages.slice(0, 4).map(img => ({
        label: img.label,
        url: `data:image/jpeg;base64,${img.b64}`
      }))
    });

  } catch (err) {
    console.error('score-roof error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
