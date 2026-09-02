const pool = require('./config/db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_incidents'").then(res => {
    console.log("exam_incidents columns:", res.rows.map(r => r.column_name));
    return pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'results'");
}).then(res => {
    console.log("results columns:", res.rows.map(r => r.column_name));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
