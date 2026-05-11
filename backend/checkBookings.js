require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const r = await pool.query(`
    SELECT b.booking_id, c.phone, s.name_en, b.scheduled_start, b.status
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    JOIN services s ON b.service_id = s.service_id
    WHERE b.status = 'confirmed'
    ORDER BY b.scheduled_start DESC
    LIMIT 10
  `);

  if (r.rows.length === 0) {
    console.log('No confirmed bookings found.');
  } else {
    console.log('Confirmed bookings:');
    r.rows.forEach(b => {
      const time = new Date(b.scheduled_start).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
      console.log(`  ${b.phone}  |  ${b.name_en}  |  ${time}  |  ${b.booking_id}`);
    });
  }

  // Cancel ALL confirmed bookings so all slots are free
  const del = await pool.query(`UPDATE bookings SET status = 'cancelled' WHERE status = 'confirmed'`);
  console.log(`\nCancelled ${del.rowCount} booking(s) — all slots are now free.`);

  await pool.end();
}

run().catch(err => { console.error(err.message); process.exit(1); });
