// controllers/reportsController.js
const { getDb } = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// POST /api/reports - Submit a site report with photo
const submitReport = async (req, res) => {
  try {
    const db = await getDb();
    const { site_id, user_id, latitude, longitude, description } = req.body;

    if (!site_id || !user_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'site_id, user_id, latitude, longitude are required'
      });
    }

    let photo_url = null;
    if (req.file) {
      photo_url = `/uploads/${req.file.filename}`;
    }

    const reportId = uuidv4();
    await db.run(
      `INSERT INTO site_reports (id, site_id, user_id, latitude, longitude, description, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reportId, site_id, user_id, parseFloat(latitude), parseFloat(longitude), description || null, photo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Thank you for helping preserve heritage!',
      report_id: reportId,
      photo_url,
      captured_location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/reports - Get all reports
const getReports = async (req, res) => {
  try {
    const db = await getDb();
    const { status, site_id } = req.query;

    let query = `
      SELECT sr.*, hs.name as site_name, hs.district
      FROM site_reports sr
      JOIN heritage_sites hs ON sr.site_id = hs.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND sr.status = ?'; params.push(status); }
    if (site_id) { query += ' AND sr.site_id = ?'; params.push(site_id); }
    query += ' ORDER BY sr.created_at DESC';

    const reports = await db.all(query, params);
    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /api/reports/:id/status - Update report status (Reported/Cleaned)
const updateReportStatus = async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.body;
    const validStatuses = ['reported', 'acknowledged', 'cleaned', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await db.run(
      'UPDATE site_reports SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({ success: true, message: `Report status updated to "${status}"` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { submitReport, getReports, updateReportStatus };
