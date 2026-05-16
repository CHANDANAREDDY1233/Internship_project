// controllers/sitesController.js
const { getDb } = require('../db/database');

// GET /api/sites - Get all sites (optionally filter by radius)
const getAllSites = async (req, res) => {
  try {
    const db = await getDb();
    const { lat, lng, radius = 50, lang = 'en' } = req.query;

    let sites = await db.all('SELECT * FROM heritage_sites WHERE status = ?', ['active']);

    // Filter by radius if lat/lng provided
    if (lat !== undefined && lng !== undefined) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      sites = sites.filter(site => {
        const dist = haversineDistance(userLat, userLng, site.latitude, site.longitude);
        site.distance_km = Math.round(dist * 10) / 10;
        return dist <= radiusKm;
      });

      sites.sort((a, b) => a.distance_km - b.distance_km);
    }

    // Localize response
    const localized = sites.map(s => localizesite(s, lang));
    res.json({ success: true, count: localized.length, sites: localized });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/sites/:id
const getSiteById = async (req, res) => {
  try {
    const db = await getDb();
    const { lang = 'en' } = req.query;
    const site = await db.get('SELECT * FROM heritage_sites WHERE id = ?', [req.params.id]);
    if (!site) return res.status(404).json({ success: false, error: 'Site not found' });
    res.json({ success: true, site: localizesite(site, lang) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/sites/qr/:code - Resolve QR code to site
const getSiteByQR = async (req, res) => {
  try {
    const db = await getDb();
    const { lang = 'en' } = req.query;
    const site = await db.get('SELECT * FROM heritage_sites WHERE qr_code = ?', [req.params.code]);
    if (!site) return res.status(404).json({ success: false, error: 'QR code not recognized' });
    res.json({ success: true, site: localizesite(site, lang), hidden_fact: site.hidden_fact });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Helper: Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

function localizesite(site, lang) {
  const out = { ...site };
  if (lang === 'kn') {
    out.display_name = site.name_kn;
    out.display_description = site.description_kn;
  } else {
    out.display_name = site.name;
    out.display_description = site.description;
  }
  return out;
}

module.exports = { getAllSites, getSiteById, getSiteByQR };
