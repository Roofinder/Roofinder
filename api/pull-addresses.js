'use strict';
const https = require('https');

function httpsGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};
  const zip        = (q.zip || '27603').trim();
  const year_min   = parseInt(q.year_min  || 1998);
  const year_max   = parseInt(q.year_max  || 2008);
  const value_min  = parseInt(q.value_min || 300000);
  const value_max  = parseInt(q.value_max || 1250000);
  const count      = Math.min(parseInt(q.count || 1000), 2000);
  const offset     = parseInt(q.offset || 0);

  const zipList = zip.split(',').map(z => z.trim()).filter(Boolean);
  const zipClause = zipList.map(z => `ZIPNUM='${z}'`).join(' OR ');

  const where = encodeURIComponent(
    `YEAR_BUILT BETWEEN ${year_min} AND ${year_max}` +
    ` AND TOTAL_VALUE_ASSD BETWEEN ${value_min} AND ${value_max}` +
    ` AND (TYPE_USE_DECODE='SINGLFAM' OR TYPE_USE_DECODE='TWOFAM' OR TYPE_USE_DECODE='TOWNHSE')` +
    ` AND (${zipClause})`
  );

  const url = 'https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/MapServer/0/query' +
    `?where=${where}` +
    `&outFields=SITE_ADDRESS,CITY_DECODE,YEAR_BUILT,TOTAL_VALUE_ASSD,ZIPNUM` +
    `&returnGeometry=false&f=json` +
    `&resultRecordCount=${count}&resultOffset=${offset}` +
    `&orderByFields=YEAR_BUILT ASC,TOTAL_VALUE_ASSD DESC`;

  try {
    const raw = await httpsGet(url, 12000);
    const data = JSON.parse(raw);
    if (data.error) return res.status(200).json({ error: data.error.message, homes: [] });

    const homes = (data.features || []).map(f => {
      const a = f.attributes;
      const street   = (a.SITE_ADDRESS  || '').trim();
      const cityVal  = (a.CITY_DECODE   || '').trim();
      const zipnum   = String(a.ZIPNUM  || '').trim();
      const year     = a.YEAR_BUILT     || '';
      const value    = a.TOTAL_VALUE_ASSD || '';
      const address  = [street.replace(/\b\w/g, c => c.toUpperCase()),
                        cityVal.replace(/\b\w/g, c => c.toUpperCase()) + ', NC',
                        zipnum].filter(Boolean).join(', ');
      return { address, year, value, zip: zipnum };
    }).filter(h => h.address);

    return res.status(200).json({ homes, total: homes.length, offset });
  } catch (err) {
    return res.status(500).json({ error: err.message, homes: [] });
  }
};
