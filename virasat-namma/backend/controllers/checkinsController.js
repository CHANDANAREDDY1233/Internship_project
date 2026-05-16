// controllers/checkinsController.js
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/checkins - Check in at a site
const checkIn = async (req, res) => {
  try {
    const db = await getDb();
    const { site_id, user_id, latitude, longitude } = req.body;

    if (!site_id || !user_id) {
      return res.status(400).json({ success: false, error: 'site_id and user_id are required' });
    }

    const site = await db.get('SELECT * FROM heritage_sites WHERE id = ?', [site_id]);
    if (!site) return res.status(404).json({ success: false, error: 'Heritage site not found' });

    // Check for duplicate same-day checkin
    const existing = await db.get(
      `SELECT * FROM checkins WHERE site_id = ? AND user_id = ?
       AND DATE(timestamp) = DATE('now')`,
       [site_id, user_id]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Already checked in at this site today',
        checkin: existing
      });
    }

    const checkinId = uuidv4();
    await db.run(
      'INSERT INTO checkins (id, site_id, user_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
      [checkinId, site_id, user_id, latitude ?? null, longitude ?? null]
    );

    // Add to Travel Passport
    const passportId = uuidv4();
    await db.run(
      'INSERT INTO travel_passport (id, user_id, site_id, checkin_id) VALUES (?, ?, ?, ?)',
      [passportId, user_id, site_id, checkinId]
    );

    res.status(201).json({
      success: true,
      message: `Checked in at ${site.name}! Stamp added to your Travel Passport.`,
      checkin_id: checkinId,
      passport_id: passportId,
      site_name: site.name
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/checkins/passport/:user_id - Get travel passport
const getTravelPassport = async (req, res) => {
  try {
    const db = await getDb();
    const { user_id } = req.params;

    const stamps = await db.all(`
      SELECT tp.*, hs.name, hs.name_kn, hs.district, hs.period, hs.image_url,
             c.timestamp as checkin_time, c.latitude, c.longitude
      FROM travel_passport tp
      JOIN heritage_sites hs ON tp.site_id = hs.id
      JOIN checkins c ON tp.checkin_id = c.id
      WHERE tp.user_id = ?
      ORDER BY tp.visit_date DESC
    `, [user_id]);

    const stats = await db.get('SELECT COUNT(*) as cnt FROM heritage_sites');
    const total_sites = stats.cnt;

    res.json({
      success: true,
      user_id,
      stamps_count: stamps.length,
      total_sites,
      completion_pct: total_sites > 0 ? Math.round((stamps.length / total_sites) * 100) : 0,
      stamps
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/checkins/status/:user_id/:site_id
const getCheckinStatus = async (req, res) => {
  try {
    const db = await getDb();
    const { user_id, site_id } = req.params;
    const checkin = await db.get(
      'SELECT * FROM checkins WHERE user_id = ? AND site_id = ? ORDER BY timestamp DESC LIMIT 1',
      [user_id, site_id]
    );

    res.json({
      success: true,
      checked_in: !!checkin,
      checkin: checkin || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { checkIn, getTravelPassport, getCheckinStatus };
