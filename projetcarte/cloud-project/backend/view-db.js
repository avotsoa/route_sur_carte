const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:132416102004@localhost:5432/postgres'
});

async function viewDatabase() {
  const client = await pool.connect();
  try {
    console.log('\n📊 === BASE DE DONNÉES: postgres ===\n');
    
    // Voir les utilisateurs
    const users = await client.query('SELECT id, email, first_name, last_name, role, is_blocked FROM users ORDER BY id');
    console.log('👥 UTILISATEURS:');
    console.table(users.rows);
    
    // Voir les signalements
    const reports = await client.query('SELECT id, latitude, longitude, description, status, surface, budget, created_at FROM reports ORDER BY id');
    console.log('\n🚧 SIGNALEMENTS:');
    console.table(reports.rows);
    
    // Statistiques
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM reports) as total_reports,
        (SELECT COUNT(*) FROM reports WHERE status = 'new') as reports_new,
        (SELECT COUNT(*) FROM reports WHERE status = 'in_progress') as reports_in_progress,
        (SELECT COUNT(*) FROM reports WHERE status = 'done') as reports_done
    `);
    console.log('\n📈 STATISTIQUES:');
    console.table(stats.rows);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

viewDatabase();
