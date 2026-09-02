const pool = require('./config/db');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS live_sessions (
                student_id INTEGER PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
                exam_name VARCHAR(255),
                last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'Active'
            )
        `);
        console.log("Successfully created live_sessions table");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

createTable();
