const https = require('https');

function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 8000, () => { req.destroy(); reject(new Error('timeout')); });
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
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Claude timeout')); });
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
    return res.status(500).json({ error: 'Missing API keys' });
  }

  try {
    // Step 1: Geocode
    const geoUrl = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) + '&key=' + GMAPS_KEY;
    const geoResp = await httpsGet(geoUrl, 5000);
    const geoData = JSON.parse(geoResp.buffer.toString());
    if (!geoData.results || !geoData.results.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'Could not locate address.', address, image_count: 0 });
    }
    const lat = geoData.results[0].geometry.location.lat;
    const lng = geoData.results[0].geometry.location.lng;

    // Step 2: Fetch 3 Street View images (small size, fast)
    const shots = [
      { heading: 0,   pitch: 25, label: 'North' },
      { heading: 120, pitch: 25, label: 'SE'    },
      { heading: 240, pitch: 25, label: 'SW'    },
    ];

    const imageResults = await Promise.all(shots.map(function(shot) {
      const url = 'https://maps.googleapis.com/maps/api/streetview?size=320x240&location=' + lat + ',' + lng + '&heading=' + shot.heading + '&pitch=' + shot.pitch + '&fov=90&key=' + GMAPS_KEY + '&return_error_code=true';
      return httpsGet(url, 5000).then(function(r) {
        if (r.status === 404 || r.buffer.length < 4000) return null;
        return { label: shot.label, b64: r.buffer.toString('base64') };
      }).catch(function() { return null; });
    }));

    const valid = imageResults.filter(Boolean);
    if (!valid.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'No Street View imagery for this address.', address, image_count: 0 });
    }

    // Step 3: Claude Haiku (fastest model)
    const content = [];
    valid.forEach(function(img) {
      content.push({ type: 'text', text: '[' + img.label + ']' });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 } });
    });
    content.push({ type: 'text', text: 'Roof condition for a Raleigh NC home. Score as roofing sales rep would:\nHOT=clear damage/wear needs roof now\nWARM=aging worth knocking\nPASS=new/good roof\nSKIP=can\'t see roof\n\nJSON only: {"score":"hot|warm|pass|skip","confidence":"high|medium|low","best_angle":"label","reasoning":"1-2 sentences"}' });

    const claudeBody = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: content }] });
    const claudeResp = await httpsPost('api.anthropic.com', '/v1/messages', {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }, claudeBody);

    if (claudeResp.status !== 200) throw new Error('Claude ' + claudeResp.status + ': ' + claudeResp.body.slice(0, 150));
    const cd = JSON.parse(claudeResp.body);
    const raw = ((cd.content && cd.content[0] && cd.content[0].text) || '{}').trim();
    var parsed;
    try { parsed = JSON.parse(raw); } catch(e) {
      var m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; } catch(e2) { parsed = { score: 'skip', confidence: 'low', reasoning: raw.slice(0, 150) }; }
    }

    return res.status(200).json({
      score: parsed.score || 'skip',
      confidence: parsed.confidence || 'low',
      best_angle: parsed.best_angle || '',
      reasoning: parsed.reasoning || '',
      address: address,
      lat: lat, lng: lng,
      image_count: valid.length,
      previews: valid.map(function(img) { return { label: img.label, url: 'data:image/jpeg;base64,' + img.b64 }; })
    });

  } catch (err) {
    console.error('score-roof:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
