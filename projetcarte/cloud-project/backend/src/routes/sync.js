const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { admin, isFirebaseAvailable } = require('../config/firebase');

const router = express.Router();

/**
 * @swagger
 * /api/sync/firebase:
 *   get:
 *     summary: Sync data from Firebase to local database (Manager only)
 *     tags: [Synchronization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed
 *       503:
 *         description: Firebase not available
 */
router.get('/firebase', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    if (!isFirebaseAvailable()) {
      return res.status(503).json({ 
        error: 'Firebase not available',
        message: 'Firebase is not configured. Using local database only.',
      });
    }

    const firestore = admin.firestore();
    
    // Get reports from Firebase that aren't synced locally
    const snapshot = await firestore.collection('reports').get();
    
    let imported = 0;
    let updated = 0;
    let errors = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      try {
        // Check if report already exists
        const existing = await db.query(
          'SELECT id FROM reports WHERE uid = $1',
          [doc.id]
        );

        if (existing.rows.length === 0) {
          // Insert new report
          const result = await db.query(
            `INSERT INTO reports (uid, latitude, longitude, description, surface, budget, company, status, firebase_synced, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
             RETURNING id`,
            [
              doc.id,
              data.latitude,
              data.longitude,
              data.description,
              data.surface,
              data.budget,
              data.company,
              data.status || 'new',
              data.created_at ? new Date(data.created_at._seconds * 1000) : new Date(),
            ]
          );
          
          const reportId = result.rows[0].id;
          
          // Sync photos if available in Firebase
          if (data.photos && Array.isArray(data.photos)) {
            for (const photo_url of data.photos) {
              await db.query(
                'INSERT INTO report_photos (report_id, photo_url) VALUES ($1, $2)',
                [reportId, photo_url]
              );
            }
          }
          
          imported++;
        } else {
          // Update existing
          const reportId = existing.rows[0].id;
          await db.query(
            `UPDATE reports SET 
              latitude = $1, longitude = $2, description = $3, 
              surface = $4, budget = $5, company = $6, 
              firebase_synced = true
             WHERE id = $7`,
            [data.latitude, data.longitude, data.description, data.surface, data.budget, data.company, reportId]
          );
          
          // Simple photo sync: clear and re-insert if changed
          if (data.photos && Array.isArray(data.photos)) {
            await db.query('DELETE FROM report_photos WHERE report_id = $1', [reportId]);
            for (const photo_url of data.photos) {
              await db.query(
                'INSERT INTO report_photos (report_id, photo_url) VALUES ($1, $2)',
                [reportId, photo_url]
              );
            }
          }
          
          updated++;
        }
      } catch (err) {
        errors.push({ uid: doc.id, error: err.message });
      }
    }

    // Log sync
    await db.query(
      'INSERT INTO sync_log (direction, records_count, status) VALUES ($1, $2, $3)',
      ['firebase_to_local', imported + updated, 'success']
    );

    res.json({
      message: 'Sync completed',
      imported,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Sync from Firebase error:', error);
    
    await db.query(
      'INSERT INTO sync_log (direction, records_count, status, error_message) VALUES ($1, $2, $3, $4)',
      ['firebase_to_local', 0, 'error', error.message]
    );
    
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/sync/to-firebase:
 *   post:
 *     summary: Sync local data to Firebase (Manager only)
 *     tags: [Synchronization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed
 *       503:
 *         description: Firebase not available
 */
router.post('/to-firebase', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    if (!isFirebaseAvailable()) {
      return res.status(503).json({ 
        error: 'Firebase not available',
        message: 'Firebase is not configured. Using local database only.',
      });
    }

    const firestore = admin.firestore();
    
    // Get reports that haven't been synced or have been updated
    const result = await db.query(
      'SELECT * FROM reports WHERE is_deleted = false'
    );

    let synced = 0;
    let errors = [];

    for (const report of result.rows) {
      try {
        // Get photos for this report
        const photosResult = await db.query(
          'SELECT photo_url FROM report_photos WHERE report_id = $1',
          [report.id]
        );
        const photos = photosResult.rows.map(p => p.photo_url);

        await firestore.collection('reports').doc(report.uid).set({
          latitude: report.latitude,
          longitude: report.longitude,
          description: report.description,
          surface: report.surface,
          budget: report.budget,
          company: report.company,
          status: report.status,
          user_id: report.user_id,
          photos: photos,
          created_at: admin.firestore.Timestamp.fromDate(new Date(report.created_at)),
          updated_at: admin.firestore.Timestamp.fromDate(new Date(report.updated_at)),
        }, { merge: true });

        await db.query(
          'UPDATE reports SET firebase_synced = true WHERE id = $1',
          [report.id]
        );
        
        synced++;
      } catch (err) {
        errors.push({ id: report.id, error: err.message });
      }
    }

    // Log sync
    await db.query(
      'INSERT INTO sync_log (direction, records_count, status) VALUES ($1, $2, $3)',
      ['local_to_firebase', synced, 'success']
    );

    res.json({
      message: 'Sync to Firebase completed',
      synced,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Sync to Firebase error:', error);
    
    await db.query(
      'INSERT INTO sync_log (direction, records_count, status, error_message) VALUES ($1, $2, $3, $4)',
      ['local_to_firebase', 0, 'error', error.message]
    );
    
    res.status(500).json({ error: 'Sync failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/sync/status:
 *   get:
 *     summary: Get synchronization status (Manager only)
 *     tags: [Synchronization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status
 */
router.get('/status', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const lastSync = await db.query(
      'SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 10'
    );

    const unsyncedCount = await db.query(
      'SELECT COUNT(*) FROM reports WHERE firebase_synced = false AND is_deleted = false'
    );

    res.json({
      firebase_available: isFirebaseAvailable(),
      unsynced_reports: parseInt(unsyncedCount.rows[0].count),
      recent_syncs: lastSync.rows,
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
