// Homeowner roof-check leads from /roof-check.
// Order matters: email the alert FIRST, then save to Firestore. Storage is best effort,
// a lead must never be lost because the database hiccuped.
// Env: RESEND_API_KEY + LEAD_TO (comma separated) for the alert. Optional LEAD_FROM.
// Firestore uses the same public web key the site already ships in admin.html.

const FS_KEY = 'AIzaSyBopCB1AwXGJmFh7xkDpxKzbhzlqAD6M1U';
const FS_URL = 'https://firestore.googleapis.com/v1/projects/roofinder-1c01f/databases/(default)/documents/homeowner_leads';

const LABELS = {
  problem: {
    leak: 'Leak or ceiling stain',
    storm: 'Storm, wind or hail damage',
    shingles: 'Missing or curling shingles',
    old: 'It is getting old',
    check: 'Just wants it checked'
  },
  roofAge: { u10: 'Under 10 years', '10to20': '10 to 20 years', o20: 'Over 20 years', unsure: 'Not sure' },
  timeline: { asap: 'ASAP', '1month': 'Within a month', '3months': 'Within 3 months', justlooking: 'Just getting estimates' },
  solar: { yes: 'Yes', maybe: 'Maybe', no: 'No' },
  // /attic-check
  atticProblem: {
    hot_cold: 'Upstairs too hot or too cold',
    bills: 'Energy bills feel high',
    drafts: 'Drafts or uneven temperatures',
    moisture: 'Moisture, mold or musty attic',
    thin: 'Insulation looks thin or old',
    check: 'Just wants it checked'
  },
  homeAge: { pre1980: 'Before 1980', '1980to2000': '1980 to 2000', '2000to2015': '2000 to 2015', post2015: 'After 2015', unsure: 'Not sure' },
  roofToo: { yes: 'Yes', maybe: 'Maybe', no: 'No' }
};

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function label(group, v) { return (LABELS[group] && LABELS[group][v]) || v || '--'; }

async function sendAlert(lead, extra) {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.LEAD_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!key || !to.length) return { ok: false, skipped: true };

  const attic = extra.service === 'attic';
  const digits = lead.phone.replace(/\D/g, '');
  const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lead.address + ' ' + lead.zip);
  const problemLabel = attic ? label('atticProblem', extra.problem) : label('problem', lead.problem);
  const rows = [
    ['Service', attic ? 'Attic insulation / ventilation' : 'Roof'],
    ['Problem', problemLabel],
    ...(attic
      ? [['Home built', label('homeAge', extra.homeAge)], ['Roof check too', label('roofToo', extra.roofToo)]]
      : [['Roof age', label('roofAge', lead.roofAge)]]),
    ['Timeline', label('timeline', lead.timeline)],
    ...(attic ? [] : [['Solar too', label('solar', lead.solar)]]),
    ['Address', lead.address + ', ' + lead.zip],
    ['Email', lead.email || '--'],
    ['Source', [lead.utm_source, lead.utm_campaign, lead.utm_content].filter(Boolean).join(' / ') || lead.area || 'direct']
  ];
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">' +
    '<h2 style="margin:0 0 4px">' + esc(lead.name) + '</h2>' +
    '<p style="margin:0 0 16px"><a href="tel:+1' + digits + '" style="font-size:20px;font-weight:bold">' + esc(lead.phone) + '</a></p>' +
    '<table cellpadding="6" style="border-collapse:collapse">' +
    rows.map(r => '<tr><td style="color:#666">' + r[0] + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('') +
    '</table>' +
    '<p><a href="' + maps + '">Open the address in Maps</a></p>' +
    '<p style="color:#888;font-size:12px">Call within the hour. Leads go cold fast.</p></div>';

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.LEAD_FROM || 'RooFinder Leads <leads@notify.nicelywebdesign.com>',
      to,
      subject: (attic ? 'Attic lead: ' : 'Roof lead: ') + lead.name + ', ' + lead.zip + ' (' + problemLabel + ')',
      html
    })
  });
  return { ok: r.ok, status: r.status };
}

async function saveLead(lead) {
  const fields = {};
  Object.keys(lead).forEach(k => { fields[k] = { stringValue: String(lead[k]) }; });
  const r = await fetch(FS_URL + '?key=' + FS_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return { ok: r.ok, status: r.status };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const b = req.body || {};
  // Honeypot: real people never see or fill this field.
  if (clean(b.company)) return res.status(200).json({ ok: true });

  // Attic leads keep their extra answers out of the Firestore document (the security rule
  // whitelists field names) and fold a readable summary into `problem` instead.
  const extra = {
    service: b.service === 'attic' ? 'attic' : 'roof',
    problem: clean(b.problem, 20),
    homeAge: clean(b.homeAge, 20),
    roofToo: clean(b.roofToo, 10)
  };
  const lead = {
    name: clean(b.name, 80),
    phone: clean(b.phone, 20),
    email: clean(b.email, 120),
    address: clean(b.address, 160),
    zip: clean(b.zip, 5),
    problem: clean(b.problem, 20),
    roofAge: clean(b.roofAge, 20),
    timeline: clean(b.timeline, 20),
    solar: clean(b.solar, 10),
    owner: clean(b.owner, 5),
    area: clean(b.area, 40),
    utm_source: clean(b.utm_source, 60),
    utm_campaign: clean(b.utm_campaign, 120),
    utm_content: clean(b.utm_content, 120),
    consent: b.consent ? 'yes' : 'no',
    consentText: clean(b.consentText, 600),
    page: extra.service === 'attic' ? '/attic-check' : '/roof-check',
    type: 'homeowner_lead',
    status: 'new',
    createdAt: new Date().toISOString()
  };

  const digits = lead.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!lead.name || digits.length !== 10 || !/^\d{5}$/.test(lead.zip) || !lead.address || lead.owner !== 'yes' || lead.consent !== 'yes') {
    return res.status(400).json({ ok: false, error: 'Missing or invalid fields' });
  }
  lead.phone = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  if (extra.service === 'attic') {
    lead.problem = ['ATTIC', label('atticProblem', extra.problem), 'built ' + label('homeAge', extra.homeAge),
      'roof too: ' + label('roofToo', extra.roofToo)].join(' | ').slice(0, 300);
    lead.roofAge = '';
    lead.solar = '';
  }

  let alert = { ok: false }, saved = { ok: false };
  try { alert = await sendAlert(lead, extra); } catch (e) { alert = { ok: false, error: String(e) }; }
  try { saved = await saveLead(lead); } catch (e) { saved = { ok: false, error: String(e) }; }

  if (!alert.ok && !saved.ok) {
    console.error('LEAD LOST RISK', JSON.stringify({ alert, saved, lead }));
    return res.status(502).json({ ok: false, error: 'Could not record the request' });
  }
  if (!alert.ok) console.error('Lead saved but alert failed', JSON.stringify(alert));
  return res.status(200).json({ ok: true, alerted: !!alert.ok, saved: !!saved.ok });
}
