const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports (with pagination and filters)
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, in_progress, done]
 *       - in: query
 *         name: uid
 *         schema:
 *           type: string
 *         description: Filter by user UID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of reports
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const uid = req.query.uid;
    const sort = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const allowedSorts = ['created_at', 'status', 'surface', 'budget'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';

    let whereConditions = ['is_deleted = false'];
    let params = [];
    let paramCount = 1;

    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (uid) {
      whereConditions.push(`uid = $${paramCount}`);
      params.push(uid);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM reports ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get reports
    params.push(limit, offset);
    const dataQuery = `
      SELECT r.*, u.first_name, u.last_name, u.email as user_email,
      (SELECT json_agg(p.photo_url) FROM report_photos p WHERE p.report_id = r.id) as photos
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await db.query(dataQuery, params);

    res.json({
      reports: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a single report by ID
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.first_name, u.last_name, u.email as user_email,
       (SELECT json_agg(p.photo_url) FROM report_photos p WHERE p.report_id = r.id) as photos
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1 AND r.is_deleted = false`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               description:
 *                 type: string
 *               surface:
 *                 type: number
 *               budget:
 *                 type: number
 *               company:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Report created
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('description').optional().isString(),
  body('surface').optional().isFloat({ min: 0 }).withMessage('Surface must be a positive number'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('company').optional().isString(),
  body('photos').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, description, surface, budget, company, photos } = req.body;
    const reportUid = uuidv4();

    // Start transaction
    await db.query('BEGIN');

    const result = await db.query(
      `INSERT INTO reports (uid, user_id, latitude, longitude, description, surface, budget, company)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [reportUid, req.user.id, latitude, longitude, description, surface, budget, company]
    );

    const report = result.rows[0];

    // Insert photos if any
    if (photos && photos.length > 0) {
      for (const photo_url of photos) {
        await db.query(
          'INSERT INTO report_photos (report_id, photo_url) VALUES ($1, $2)',
          [report.id, photo_url]
        );
      }
    }

    await db.query('COMMIT');

    // Get report with photos
    const finalResult = await db.query(
      `SELECT r.*, (SELECT json_agg(p.photo_url) FROM report_photos p WHERE p.report_id = r.id) as photos
       FROM reports r WHERE r.id = $1`,
      [report.id]
    );

    res.status(201).json({
      message: 'Report created successfully',
      report: finalResult.rows[0],
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Update a report (Manager only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               surface:
 *                 type: number
 *               budget:
 *                 type: number
 *               company:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report updated
 *       404:
 *         description: Report not found
 */
router.put('/:id', authenticateToken, requireRole('manager'), [
  body('surface').optional().isFloat({ min: 0 }).withMessage('Surface must be a positive number'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, surface, budget, company } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (surface !== undefined) {
      updates.push(`surface = $${paramCount}`);
      values.push(surface);
      paramCount++;
    }
    if (budget !== undefined) {
      updates.push(`budget = $${paramCount}`);
      values.push(budget);
      paramCount++;
    }
    if (company !== undefined) {
      updates.push(`company = $${paramCount}`);
      values.push(company);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    const result = await db.query(
      `UPDATE reports SET ${updates.join(', ')} 
       WHERE id = $${paramCount} AND is_deleted = false
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      message: 'Report updated successfully',
      report: result.rows[0],
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/reports/{id}/status:
 *   patch:
 *     summary: Update report status (Manager only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in_progress, done]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Report not found
 */
router.patch('/:id/status', authenticateToken, requireRole('manager'), [
  body('status').isIn(['new', 'in_progress', 'done']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    const result = await db.query(
      'UPDATE reports SET status = $1 WHERE id = $2 AND is_deleted = false RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      message: 'Status updated successfully',
      report: result.rows[0],
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report (soft delete, Manager only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report deleted
 *       404:
 *         description: Report not found
 */
router.delete('/:id', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE reports SET is_deleted = true WHERE id = $1 AND is_deleted = false RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
