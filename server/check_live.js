const pool = require('./config/db');
async function check() {
    try {
        const live = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['live_monitoring']);
        console.log("live_monitoring cols:", live.rows.map(r => r.column_name));
        const sess = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['exam_sessions']);
        console.log("exam_sessions cols:", sess.rows.map(r => r.column_name));
    } catch(e) { console.error(e) }
    process.exit(0);
}
check();
