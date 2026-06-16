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
    return res.status(500).json({ error: 'Missing API keys — set GOOGLE_MAPS_KEY and ANTHROPIC_API_KEY in Vercel environment variables' });
  }

  try {
    // ── Step 1: Geocode address to lat/lng ──────────────────────
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GMAPS_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results?.length) {
      return res.status(200).json({ score: 'skip', confidence: 'low', reasoning: 'Could not locate this address.', address, images: [] });
    }

    const { lat, lng } = geoData.results[0].geometry.location;

    // ── Step 2: Pull 8 angles — full sweep around the home ──────
    // 8 headings (every 45°) × 2 pitches = comprehensive roof view
    const shots = [
      { heading: 0,   pitch: 10,  label: 'North'       },
      { heading: 45,  pitch: 10,  label: 'NE'          },
      { heading: 90,  pitch: 10,  label: 'East'        },
      { heading: 135, pitch: 10,  label: 'SE'          },
      { heading: 180, pitch: 10,  label: 'South'       },
      { heading: 225, pitch: 10,  label: 'SW'          },
      { heading: 270, pitch: 10,  label: 'West'        },
      { heading: 315, pitch: 10,  label: 'NW'          },
      { heading: 0,   pitch: 35,  label: 'Roof (N)'    },
      { heading: 90,  pitch: 35,  label: 'Roof (E)'    },
      { heading: 180, pitch: 35,  label: 'Roof (S)'    },
      { heading: 270, pitch: 35,  label: 'Roof (W)'    },
    ];

    const imageResults = await Promise.all(shots.map(async (shot) => {
      const url = `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${lat},${lng}&heading=${shot.heading}&pitch=${shot.pitch}&fov=90&key=${GMAPS_KEY}&return_error_code=true`;
      try {
        const r = await fetch(url);
        // Google returns a grey "no imagery" image — check content-length
        if (!r.ok || r.status === 404) return null;
        const buf = await r.arrayBuffer();
        // Skip if too small (grey placeholder is ~3-4KB)
        if (buf.byteLength < 5000) return null;
        const b64 = Buffer.from(buf).toString('base64');
        return { ...shot, b64, url: `data:image/jpeg;base64,${b64}` };
      } catch { return null; }
    }));

    const validImages = imageResults.filter(Boolean);

    if (!validImages.length) {
      return res.status(200).json({
        score: 'skip', confidence: 'low',
        reasoning: 'No Street View imagery available for this address.',
        address, images: []
      });
    }

    // ── Step 3: Send all images to Claude ───────────────────────
    const content = [];

    // Add each image with its label
    validImages.forEach((img) => {
      content.push({ type: 'text', text: `[View: ${img.label}]` });
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: img.b64 