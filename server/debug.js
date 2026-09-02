const pool = require('./config/db');

async function debugDB() {
    try {
        const incidents = await pool.query("SELECT id, student_id, incident_type, created_at FROM exam_incidents ORDER BY created_at DESC LIMIT 20");
        console.log("Recent exam_incidents:");
        console.table(incidents.rows);

        const results = await pool.query("SELECT result_id, student_id, submitted_at FROM results ORDER BY submitted_at DESC LIMIT 5");
        console.log("Recent results:");
        console.table(results.rows);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugDB();
