const pool = require('./config/db');
pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`).then(res => {
    console.log(res.rows);
    process.exit(0);
}).catch(console.error);
