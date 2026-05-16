// routes/index.js
const express = require('express');
const router = express.Router();

const { getAllSites, getSiteById, getSiteByQR } = require('../controllers/sitesController');
const { checkIn, getTravelPassport, getCheckinStatus } = require('../controllers/checkinsController');
const { submitReport, getReports, updateReportStatus } = require('../controllers/reportsController');
const { registerUser, getUser, updateLanguage } = require('../controllers/usersController');
const { upload, compressAndSave } = require('../middleware/upload');

// ── Heritage Sites ──────────────────────────────────────────────
router.get('/sites', getAllSites);
router.get('/sites/qr/:code', getSiteByQR);
router.get('/sites/:id', getSiteById);

// ── Check-ins & Travel Passport ─────────────────────────────────
router.post('/checkins', checkIn);
router.get('/checkins/passport/:user_id', getTravelPassport);
router.get('/checkins/status/:user_id/:site_id', getCheckinStatus);

// ── Site Reports ────────────────────────────────────────────────
router.post('/reports', upload.single('photo'), compressAndSave, submitReport);
router.get('/reports', getReports);
router.patch('/reports/:id/status', updateReportStatus);

// ── Users ───────────────────────────────────────────────────────
router.post('/users/register', registerUser);
router.get('/users/:id', getUser);
router.patch('/users/:id/language', updateLanguage);

// ── Health Check ────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'Virasat-Namma API is running', timestamp: new Date() });
});

module.exports = router;
