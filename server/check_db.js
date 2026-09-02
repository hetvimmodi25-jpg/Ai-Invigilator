const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_invigilator',
  password: 'Admin@123',
  port: 5432,
});

async function check() {
  try {
    const res = await pool.query('SELECT * FROM exam_incidents ORDER BY created_at DESC LIMIT 10');
    console.log("Exam incidents:", res.rows);
    
    const res2 = await pool.query('SELECT * FROM results ORDER BY submitted_at DESC LIMIT 2');
    console.log("Results:", res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
