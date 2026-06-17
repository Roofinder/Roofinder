// score-roof-v2.js — experimental scoring endpoint. Does NOT touch the live
// score-roof.js used by label.html. POST /api/score-roof-v2
//
// Changes vs v1:
//  - DECISIVE scoring: HOT (clearly needs replacement) or PASS (everything else,
//    incl. aging-but-ok and can't-tell). High bar; when unsure -> PASS.
//  - Better images: pitch up (35), moderate FOV (80) to stay SHARP not blurry,
//    640x640 resolution (more real pixels, not magnification).
//  - Returns image_date from Street View metadata (surfaced, NOT yet filtered) so
//    we can see how fresh Raleigh's coverage is before turning on a hard 2024+ gate.
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
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'Could not locate address.', address, image_count: 0 });
    }
    const lat = geoData.results[0].geometry.location.lat;
    const lng = geoData.results[0].geometry.location.lng;

    // Step 1b: Street View metadata — capture date (FREE call). Surfaced only for now.
    let image_date = null;
    try {
      const metaUrl = 'https://maps.googleapis.com/maps/api/streetview/metadata?location=' + lat + ',' + lng + '&key=' + GMAPS_KEY;
      const metaResp = await httpsGet(metaUrl, 4000);
      const meta = JSON.parse(metaResp.buffer.toString());
      if (meta.status === 'OK' && meta.date) image_date = meta.date; // "YYYY-MM"
      // NOTE: once we've seen coverage, gate here: if year(image_date) < 2024 -> skip.
    } catch (e) { /* non-fatal: leave image_date null */ }

    // Step 2: Fetch Street View images — pitched up, moderate FOV (sharp), 640x640.
    const shots = [
      { heading: 0,   pitch: 35, fov: 80, label: 'North' },
      { heading: 120, pitch: 35, fov: 80, label: 'SE'    },
      { heading: 240, pitch: 35, fov: 80, label: 'SW'    },
    ];

    const imageResults = await Promise.all(shots.map(function(shot) {
      const url = 'https://maps.googleapis.com/maps/api/streetview?size=640x640&location=' + lat + ',' + lng + '&heading=' + shot.heading + '&pitch=' + shot.pitch + '&fov=' + shot.fov + '&key=' + GMAPS_KEY + '&return_error_code=true';
      return httpsGet(url, 5000).then(function(r) {
        if (r.status === 404 || r.buffer.length < 4000) return null;
        return { label: shot.label, b64: r.buffer.toString('base64') };
      }).catch(function() { return null; });
    }));

    const valid = imageResults.filter(Boolean);
    if (!valid.length) {
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'No Street View imagery for this address.', address, image_count: 0, image_date });
    }

    // Step 3: Claude Haiku — decisive HOT/PASS inspection.
    const content = [];
    valid.forEach(function(img) {
      content.push({ type: 'text', text: '[' + img.label + ']' });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 } });
    });
    content.push({ type: 'text', text:
      'You are a roofing sales rep deciding whether to knock this Raleigh NC home. Judge ONLY the roof.\n\n' +
      'Choose ONE:\n' +
      '- "hot": the roof CLEARLY needs replacement NOW. Visible signs: missing / cracked / curling / lifting shingles; heavy dark streaking (algae); bald spots or granule loss; visible patches or tarps; a sagging or wavy roofline.\n' +
      '- "pass": everything else — a sound roof, a roof that is merely aging but still okay, OR a roof you cannot clearly see or assess.\n\n' +
      'Be strict. Only choose "hot" when the need for replacement is clearly visible. If you are unsure, or the roof is just "kind of old", choose "pass". We only want roofs that clearly need replacing.\n' +
      'You can see the shingle surface, but you CANNOT see the wood decking beneath the shingles — only mention structure if the roofline visibly sags.\n\n' +
      'Reply JSON only: {"score":"hot|pass","confidence":"high|medium|low","best_angle":"North|SE|SW","reasoning":"1-2 sentences citing what you actually see"}' });

    const claudeBody = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 220, messages: [{ role: 'user', content: content }] });
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
      try { parsed = m ? JSON.parse(m[0]) : {}; } catch(e2) { parsed = { score: 'pass', confidence: 'low', reasoning: raw.slice(0, 150) }; }
    }

    // Normalize: anything that isn't a clean "hot" collapses to "pass".
    const score = (parsed.score === 'hot') ? 'hot' : 'pass';

    return res.status(200).json({
      score: score,
      confidence: parsed.confidence || 'low',
      best_angle: parsed.best_angle || '',
      reasoning: parsed.reasoning || '',
      address: address,
      lat: lat, lng: lng,
      image_date: image_date,
      image_count: valid.length,
      previews: valid.map(function(img) { return { label: img.label, url: 'data:image/jpeg;base64,' + img.b64 }; })
    });

  } catch (err) {
    console.error('score-roof-v2:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
