// controllers/usersController.js
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/users/register
const registerUser = async (req, res) => {
  try {
    const db = await getDb();
    const { name, device_id, preferred_lang = 'en' } = req.body;

    if (!device_id) {
      return res.status(400).json({ success: false, error: 'device_id is required' });
    }

    const existing = await db.get('SELECT * FROM users WHERE device_id = ?', [device_id]);
    if (existing) {
      return res.json({ success: true, user: existing, message: 'Welcome back!' });
    }

    const userId = uuidv4();
    await db.run(
      'INSERT INTO users (id, name, device_id, preferred_lang) VALUES (?, ?, ?, ?)',
      [userId, name || 'Heritage Explorer', device_id, preferred_lang]
    );

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json({ success: true, user, message: 'Welcome to Virasat-Namma!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/users/:id/language
const updateLanguage = async (req, res) => {
  try {
    const db = await getDb();
    const { lang } = req.body;
    if (!['en', 'kn'].includes(lang)) {
      return res.status(400).json({ success: false, error: 'Language must be "en" or "kn"' });
    }
    await db.run('UPDATE users SET preferred_lang = ? WHERE id = ?', [lang, req.params.id]);
    res.json({ success: true, message: `Language updated to ${lang === 'kn' ? 'ಕನ್ನಡ' : 'English'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { registerUser, getUser, updateLanguage };
