const pool = require('./config/db');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS student_messages (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Successfully created student_messages table");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

createTable();
