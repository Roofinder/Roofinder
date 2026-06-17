// score-roof-v2.js — experimental scoring endpoint. Does NOT touch live score-roof.js.
// POST /api/score-roof-v2
//
// TWO-PASS roof focus ("heat zone"):
//  Pass 1 (LOCATE): send 3 wide pitched-up angles; AI picks the angle with the
//    clearest roof and says whether the roof is actually visible. If it's hidden by
//    trees / out of frame -> PASS immediately (no guessing), skip Pass 2.
//  RE-ZOOM: re-fetch the chosen angle with a tighter FOV (and pitch nudge) so the
//    roof fills the frame. Done via the Street View API (renders from the panorama),
//    NOT digital upscaling -> stays sharp.
//  Pass 2 (INSPECT): decisive HOT / PASS on the zoomed roof image.
// Also returns image_date (Street View capture month, surfaced not yet filtered).
const https = require('https');

const HEADINGS = { North: 0, SE: 120, SW: 240 };
const VERSION = 'v2.3-snowfix';

function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
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
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 7000, () => { req.destroy(); reject(new Error('Claude timeout')); });
    req.write(buf);
    req.end();
  });
}

function streetViewUrl(key, lat, lng, heading, pitch, fov) {
  return 'https://maps.googleapis.com/maps/api/streetview?size=640x640&location=' + lat + ',' + lng +
    '&heading=' + heading + '&pitch=' + pitch + '&fov=' + fov + '&key=' + key + '&return_error_code=true';
}

function fetchShot(key, lat, lng, heading, pitch, fov, label) {
  return httpsGet(streetViewUrl(key, lat, lng, heading, pitch, fov), 5000).then(function (r) {
    if (r.status === 404 || r.buffer.length < 4000) return null;
    return { label: label, b64: r.buffer.toString('base64') };
  }).catch(function () { return null; });
}

function parseJsonLoose(raw) {
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
  return parseJsonLoose(raw);
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
    // Step 1: Geocode
    const geoResp = await httpsGet('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) + '&key=' + GMAPS_KEY, 5000);
    const geoData = JSON.parse(geoResp.buffer.toString());
    if (!geoData.results || !geoData.results.length) {
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'Could not locate address.', address, image_count: 0, roof_visible: false });
    }
    const lat = geoData.results[0].geometry.location.lat;
    const lng = geoData.results[0].geometry.location.lng;

    // Step 1b: Street View capture date (FREE). Surfaced only for now.
    let image_date = null;
    try {
      const metaResp = await httpsGet('https://maps.googleapis.com/maps/api/streetview/metadata?location=' + lat + ',' + lng + '&key=' + GMAPS_KEY, 4000);
      const meta = JSON.parse(metaResp.buffer.toString());
      if (meta.status === 'OK' && meta.date) image_date = meta.date; // "YYYY-MM"
    } catch (e) { /* non-fatal */ }

    // Step 2: WIDE shots — pitch 12, fov 80 (sharp, roof roughly centered).
    const wide = (await Promise.all([
      fetchShot(GMAPS_KEY, lat, lng, 0, 12, 80, 'North'),
      fetchShot(GMAPS_KEY, lat, lng, 120, 12, 80, 'SE'),
      fetchShot(GMAPS_KEY, lat, lng, 240, 12, 80, 'SW'),
    ])).filter(Boolean);
    if (!wide.length) {
      return res.status(200).json({ score: 'pass', confidence: 'low', reasoning: 'No Street View imagery for this address.', address, image_count: 0, image_date, roof_visible: false });
    }

    // Step 3 — PASS 1 (LOCATE the roof).
    const p1content = [];
    wide.forEach(function (img) { p1content.push({ type: 'text', text: '[' + img.label + ']' }); p1content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 } }); });
    p1content.push({ type: 'text', text:
      'These are Street View angles of one property. Find the MAIN house roof.\n' +
      'Reply JSON only: {"roof_visible":true|false,"best_angle":"North|SE|SW","look":"up|down|none"}\n' +
      '- roof_visible=false if the roof is mostly hidden by trees, blocked, or not in frame. Be honest — if you cannot clearly see roof surface, say false.\n' +
      '- best_angle = the angle with the clearest, most complete view of the roof.\n' +
      '- look = to center the roof, should the camera tilt "up", "down", or "none" if already centered.' });
    const loc = await callClaude(ANTHROPIC_KEY, p1content, 80);

    const labels = wide.map(function (w) { return w.label; });
    let bestLabel = (loc.best_angle && labels.indexOf(loc.best_angle) >= 0) ? loc.best_angle : labels[0];

    if (loc.roof_visible === false) {
      return res.status(200).json({
        score: 'pass', confidence: 'high',
        reasoning: 'Roof not clearly visible from Street View (obscured by trees or out of frame) — skipped rather than guessed.',
        address, lat, lng, image_date, image_count: wide.length, roof_visible: false,
        best_angle: bestLabel,
        previews: wide.map(function (img) { return { label: img.label, url: 'data:image/jpeg;base64,' + img.b64 }; })
      });
    }

    // RE-ZOOM the chosen angle: tighter fov (65) fills the frame with roof; pitch nudge to center.
    const pitch = loc.look === 'up' ? 20 : (loc.look === 'down' ? 5 : 12);
    const heading = HEADINGS[bestLabel] != null ? HEADINGS[bestLabel] : 0;
    let zoom = await fetchShot(GMAPS_KEY, lat, lng, heading, pitch, 65, bestLabel + ' (roof)');
    if (!zoom) { // fall back to the wide best-angle image we already have
      const w = wide.filter(function (x) { return x.label === bestLabel; })[0] || wide[0];
      zoom = { label: w.label + ' (roof)', b64: w.b64 };
    }

    // Step 4 — PASS 2 (INSPECT the zoomed roof). Decisive HOT/PASS.
    const p2content = [
      { type: 'text', text: '[' + zoom.label + ']' },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: zoom.b64 } },
      { type: 'text', text:
        'You are a roofing sales rep judging ONLY this roof in Raleigh NC.\n' +
        'Choose ONE:\n' +
        '- "hot": the roof CLEARLY needs replacement NOW — missing/cracked/curling/lifting shingles; heavy dark streaking (algae); bald spots or granule loss; visible patches or tarps; a sagging or wavy roofline.\n' +
        '- "pass": everything else — a sound roof, a merely aging-but-okay roof, or one you cannot clearly assess.\n' +
        'IGNORE WEATHER & LIGHTING: snow, ice, frost, wet leaves, debris, and shadows are NOT roof damage. White or light patches on a dark roof in a winter/snowy scene are almost always snow — do NOT read them as missing shingles, bald spots, or granule loss. If the scene shows snow on the ground/cars/trees, be especially careful not to mistake snow on the roof for damage.\n' +
        'Be strict: only "hot" when replacement need is clearly visible; when unsure, "pass". You can see shingles but NOT the wood decking beneath — only mention structure if the roofline visibly sags.\n' +
        'Reply JSON only: {"score":"hot|pass","confidence":"high|medium|low","reasoning":"1-2 sentences citing what you see"}' }
    ];
    const parsed = await callClaude(ANTHROPIC_KEY, p2content, 220);
    const score = (parsed.score === 'hot') ? 'hot' : 'pass';

    return res.status(200).json({
      score: score,
      confidence: parsed.confidence || 'low',
      reasoning: parsed.reasoning || '',
      address, lat, lng, image_date,
      best_angle: bestLabel,
      roof_visible: true,
      version: VERSION,
      image_count: wide.length + 1,
      previews: [
        { label: zoom.label, url: 'data:image/jpeg;base64,' + zoom.b64 },
        { label: bestLabel + ' (wide)', url: 'data:image/jpeg;base64,' + (wide.filter(function (x) { return x.label === bestLabel; })[0] || wide[0]).b64 }
      ]
    });

  } catch (err) {
    console.error('score-roof-v2:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
