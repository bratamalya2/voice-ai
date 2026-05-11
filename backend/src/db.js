const { Pool, types } = require('pg');

// TIMESTAMP WITHOUT TIME ZONE (OID 1114) values are stored as bare strings
// like "2026-05-03 23:00:00". pg's default parser treats that string as LOCAL
// machine time (IST on this Windows dev machine), shifting the value by 5.5h.
// Appending 'Z' before parsing forces UTC interpretation, which matches how
// we always write — ISO strings with Z suffix.
types.setTypeParser(1114, val => val === null ? null : new Date(val + 'Z'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err.message);
});

module.exports = pool;
