// score-roof-v2.js — experimental scoring endpoint. Does NOT touch live score-roof.js.
// POST /api/score-roof-v2
//
// v2.4 — AIM THE CAMERA AT THE HOUSE.
//  Old versions shot fixed compass headings (0/120/240) that often faced away from
//  the house. Now: geocode the house, read the Street View panorama's own location
//  from metadata, and compute the bearing camera->house so the lens points right at
//  it. Three shots around that bearing (center / left / right) give the inspector a
//  choice; if none clearly show a roof -> PASS (no guessing).
//  Two-pass: Pass 1 locates roof + picks angle; re-zoom that angle; Pass 2 = HOT/PASS.
//  Decisive HOT/PASS, ignores snow/debris/shadows, returns image_date.
const https = require('https');
const VERSION = 'v2.9-snowgate';

function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 6000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsPost(hostname, path, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const opts = { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': buf.length } };
    const req = https.request(opts, (res) => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 7000, () => { req.destroy(); reject(new Error('Claude timeout')); });
    req.write(buf); req.end();
  });
}

// Compass bearing (degrees) FROM (lat1,lng1) TO (lat2,lng2).
function bearing(lat1, lng1, lat2, lng2) {
  const toR = Math.PI / 180, toD = 180 / Math.PI;
  const p1 = lat1 * toR, p2 = lat2 * toR, dl = (lng2 - lng1) * toR;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * toD + 360) % 360;
}

function svUrl(key, lat, lng, heading, pitch, fov) {
  let u = 'https://maps.googleapis.com/maps/api/streetview?size=640x640&location=' + lat + ',' + lng +
    '&pitch=' + pitch + '&fov=' + fov + '&key=' + key + '&return_error_code=true';
  if (heading != null) u += '&heading=' + heading;   // omit -> Google auto-aims at location
  return u;
}

function fetchShot(key, lat, lng, heading, pitch, fov, label) {
  return httpsGet(svUrl(key, lat, lng, heading, pitch, fov), 5000).then(function (r) {
    if (r.status === 404 || r.buffer.length < 4000) return null;
    return { label: label, heading: heading, b64: r.buffer.toString('base64') };
  }).catch(function () { return null; });
}

function parseLoose(raw) {
  try { return JSON.parse(raw); } catch (e) {
    var m = raw.match(/\{[\s\S]*\}/);
    try { return m ? JSON.parse(m[0]) : {}; } catch (e2) { return {}; }
  }
}

async function callClaude(key, content, maxTokens) {
  const body = JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages: [{ role: 'user', content: content }] });
  const resp = await httpsPost('api.anthropic.com', '/v1/messages', {
    'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'
  }, body, 7000);
  if (resp.status !== 200) throw new Error('Claude ' + resp.status + ': ' + resp.body.slice(0, 150));
  const cd = JSON.parse(resp.body);
  const raw = ((cd.content && cd.content[0] && cd.content[0].text) || '{}').trim();
  return parseLoose(raw);
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
  if (!GMAPS_KEY || !ANTHROPIC_KEY) return res.status(500).json({ error: 'Missing API keys' });

  try {
    // Step 1: Geocode the house.
    const geoResp = await httpsGet('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) + '&key=' + GMAPS_KEY, 5000);
    const geoData = JSON.parse(geoResp.buffer.toString());
    if (!geoData.results || !geoData.results.length) {
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'Could not locate address.', address, image_count: 0, roof_visible: false, version: VERSION });
    }
    const g0 = geoData.results[0];
    const lat = g0.geometry.location.lat, lng = g0.geometry.location.lng;
    const geo_precision = (g0.geometry.location_type || ''); // ROOFTOP / RANGE_INTERPOLATED / GEOMETRIC_CENTER / APPROXIMATE

    // Step 1b: Street View metadata — capture date + the panorama's own location.
    let image_date = null, panoLat = null, panoLng = null;
    try {
      const metaResp = await httpsGet('https://maps.googleapis.com/maps/api/streetview/metadata?location=' + lat + ',' + lng + '&key=' + GMAPS_KEY, 4000);
      const meta = JSON.parse(metaResp.buffer.toString());
      if (meta.status === 'OK') {
        if (meta.date) image_date = meta.date;
        if (meta.location) { panoLat = meta.location.lat; panoLng = meta.location.lng; }
      }
    } catch (e) { /* non-fatal */ }

    // AIM: heading from the camera (pano) to the house. If unknown, let Google auto-aim.
    let aim = null;
    if (panoLat != null && panoLng != null) aim = bearing(panoLat, panoLng, lat, lng);
    const shotsPlan = (aim != null)
      ? [{ label: 'center', h: aim }, { label: 'left', h: (aim - 25 + 360) % 360 }, { label: 'right', h: (aim + 25) % 360 }]
      : [{ label: 'center', h: null }];

    // Step 2: WIDE shots aimed at the house. pitch 15, fov 75 (sharp, roof in frame).
    const wide = (await Promise.all(shotsPlan.map(function (s) {
      return fetchShot(GMAPS_KEY, lat, lng, s.h, 15, 75, s.label);
    }))).filter(Boolean);
    if (!wide.length) {
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'No Street View imagery for this address.', address, image_count: 0, image_date, roof_visible: false, version: VERSION });
    }

    // PASS 1 — locate the roof.
    const p1 = [];
    wide.forEach(function (img) { p1.push({ type: 'text', text: '[' + img.label + ']' }); p1.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 } }); });
    p1.push({ type: 'text', text:
      'These Street View angles are aimed at one house. Find the MAIN house roof.\n' +
      'Reply JSON only: {"roof_visible":true|false,"best_angle":"center|left|right","look":"up|down|none"}\n' +
      '- roof_visible=false if the images show mostly road/trees/another building, or the roof is blocked/not in frame. Be honest.\n' +
      '- best_angle = the label with the clearest, most complete roof view.\n' +
      '- look = to center the roof, tilt "up", "down", or "none".' });
    const loc = await callClaude(ANTHROPIC_KEY, p1, 80);

    const labels = wide.map(function (w) { return w.label; });
    let bestLabel = (loc.best_angle && labels.indexOf(loc.best_angle) >= 0) ? loc.best_angle : labels[0];
    const bestShot = wide.filter(function (w) { return w.label === bestLabel; })[0] || wide[0];

    if (loc.roof_visible === false) {
      return res.status(200).json({
        score: 'pass', confidence: 'high',
        reasoning: 'Roof not clearly visible from Street View (road/trees/blocked or out of frame) — skipped rather than guessed.',
        address, lat, lng, image_date, geo_precision, image_count: wide.length, roof_visible: false, best_angle: bestLabel, version: VERSION,
        previews: wide.map(function (img) { return { label: img.label, url: 'data:image/jpeg;base64,' + img.b64 }; })
      });
    }

    // RE-ZOOM the chosen angle: tighter fov (60) + pitch nudge. Falls back to wide shot.
    const pitch = loc.look === 'up' ? 22 : (loc.look === 'down' ? 8 : 15);
    let zoom = (bestShot.heading != null)
      ? await fetchShot(GMAPS_KEY, lat, lng, bestShot.heading, pitch, 60, bestLabel + ' (roof)')
      : await fetchShot(GMAPS_KEY, lat, lng, null, pitch, 60, bestLabel + ' (roof)');
    if (!zoom) zoom = { label: bestLabel + ' (roof)', b64: bestShot.b64 };

    // PASS 2 — decisive HOT/PASS on the zoomed roof.
    const p2 = [
      { type: 'text', text: '[' + zoom.label + ']' },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: zoom.b64 } },
      { type: 'text', text:
        'You are an experienced roofing sales rep deciding if this Raleigh NC roof is a VIABLE LEAD — a roof aging enough to be worth knocking. Judge ONLY the main house the camera is centered on; ignore neighboring roofs.\n\n' +
        'STEP 1 — SNOW CHECK (do this first, it OVERRIDES everything below). Look at the roof shingles themselves. If you see white or light patches of SNOW or ICE sitting ON the roof (very common when there is also snow on the ground, bare winter trees, or snow on cars), you CANNOT judge the roof — score "pass" immediately. Snow patches on a dark roof look like faded/washed/bald spots but they are NOT — never call a snow-covered roof aged or hot. (Snow only on the ground/trees while the shingles are clearly snow-free does not block judgment.)\n\n' +
        'STEP 2 — If the roof is snow-free and visible, this is lead generation: when in doubt, LEAN TOWARD flagging (a wasted knock costs little; a missed aging roof is a lost lead).\n' +
        'Score "hot" (a lead worth knocking) when you see ANY clear sign the roof is aging / nearing end of life:\n' +
        '1. WASHED-OUT / FADED — shingles have lost their dark, rich color and look dull, gray, light, sun-bleached. THE #1 SIGN of an aging roof.\n' +
        '2. LOSS OF SHINGLE DEFINITION — you can no longer make out crisp individual shingle tabs/lines; the surface looks smooth, flat, or washed uniform.\n' +
        '3. COLOR INCONSISTENCY — blotchy/uneven color, whitish or worn edges, two-tone sections (e.g. a partial prior replacement).\n' +
        '4. Dark streaking together with a faded/washed look.\n' +
        '5. Classic damage — missing/cracked/curling/lifting shingles, bald spots/granule loss, patches or tarps, a sagging/wavy roofline.\n' +
        '6. The roof looks clearly older/duller than neighboring roofs in the frame.\n\n' +
        'Score "pass" when the roof still looks healthy: reasonably rich, consistent color AND clearly visible shingle-tab definition. Light streaking ALONE with otherwise good color and visible tabs is NOT enough — pass it.\n\n' +
        'ONLY TWO things force a "pass" regardless of the above:\n' +
        '- SNOW or ice covering the roof SHINGLES so you cannot see their color/condition. (Snow merely on the ground/trees/cars while the shingles are visible does NOT count — judge the roof normally.)\n' +
        '- You genuinely cannot see the main roof surface at all (only a gable-end sliver, or it is fully blocked).\n\n' +
        'You see the shingle surface, not the wood decking — only mention structure if the roofline visibly sags.\n' +
        'Reply JSON only: {"score":"hot|pass","confidence":"high|medium|low","reasoning":"1-2 sentences citing the specific signs (or why passed: snow / not visible / still-healthy)"}' }
    ];
    const parsed = await callClaude(ANTHROPIC_KEY, p2, 220);
    const score = (parsed.score === 'hot') ? 'hot' : 'pass';

    return res.status(200).json({
      score: score, confidence: parsed.confidence || 'low', reasoning: parsed.reasoning || '',
      address, lat, lng, image_date, geo_precision, best_angle: bestLabel, roof_visible: true,
      version: VERSION, image_count: wide.length + 1,
      previews: [
        { label: zoom.label, url: 'data:image/jpeg;base64,' + zoom.b64 },
        { label: bestLabel + ' (wide)', url: 'data:image/jpeg;base64,' + bestShot.b64 }
      ]
    });
  } catch (err) {
    console.error('score-roof-v2:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
