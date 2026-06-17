'use strict';
const https = require('https');

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
  if (heading != null) u += '&heading=' + heading;
  return u;
}

function fetchShot(key, lat, lng, heading, pitch, fov) {
  return httpsGet(svUrl(key, lat, lng, heading, pitch, fov), 5000).then(function (r) {
    if (r.status === 404 || r.buffer.length < 4000) return null;
    return r.buffer.toString('base64');
  }).catch(function () { return null; });
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
  if (!GMAPS_KEY) return res.status(500).json({ error: 'Missing GOOGLE_MAPS_KEY' });

  try {
    // Geocode
    const geoResp = await httpsGet('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) + '&key=' + GMAPS_KEY, 5000);
    const geoData = JSON.parse(geoResp.buffer.toString());
    if (!geoData.results || !geoData.results.length) {
      return res.status(200).json({ ok: false, reason: 'no_geocode', address });
    }
    const g0 = geoData.results[0];
    const lat = g0.geometry.location.lat, lng = g0.geometry.location.lng;
    const geo_precision = g0.geometry.location_type || '';

    // Street View metadata — get pano location for aim
    let image_date = null, panoLat = null, panoLng = null;
    try {
      const metaResp = await httpsGet('https://maps.googleapis.com/maps/api/streetview/metadata?location=' + lat + ',' + lng + '&key=' + GMAPS_KEY, 4000);
      const meta = JSON.parse(metaResp.buffer.toString());
      if (meta.status === 'OK') {
        if (meta.date) image_date = meta.date;
        if (meta.location) { panoLat = meta.location.lat; panoLng = meta.location.lng; }
      }
    } catch (e) { /* non-fatal */ }

    const aim = (panoLat != null && panoLng != null) ? bearing(panoLat, panoLng, lat, lng) : null;

    // Fetch overview + zoom shots
    const [overview, zoom] = await Promise.all([
      fetchShot(GMAPS_KEY, lat, lng, aim, 15, 78),
      fetchShot(GMAPS_KEY, lat, lng, aim, 15, 55),
    ]);

    if (!overview && !zoom) {
      return res.status(200).json({ ok: false, reason: 'no_streetview', address, lat, lng });
    }

    return res.status(200).json({
      ok: true,
      address,
      lat,
      lng,
      geo_precision,
      image_date,
      overview_b64: overview || null,
      zoom_b64: zoom || null,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, reason: 'error', message: err.message });
  }
};
