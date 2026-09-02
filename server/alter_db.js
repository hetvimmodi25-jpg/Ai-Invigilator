const pool = require('./config/db');

async function alterTable() {
    try {
        await pool.query(`
            ALTER TABLE exam_incidents 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending'
        `);
        console.log("Successfully added status column to exam_incidents");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterTable();
