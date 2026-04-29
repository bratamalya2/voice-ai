require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const pool = require('./src/db');

async function migrate() {
  try {
    const sql = fs.readFileSync(__dirname + '/../sql/002_add_call_context.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration 002 applied successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    pool.end();
  }
}

migrate();
