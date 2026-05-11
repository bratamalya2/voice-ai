require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false } : false,
});

async function cleanup() {
  // Cancel all test bookings created by the test phone number
  const r1 = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE customer_id IN (SELECT customer_id FROM customers WHERE phone = $1)
       AND status = 'confirmed'`,
    ['+61499999999']
  );
  console.log(`Cancelled ${r1.rowCount} test booking(s) for +61499999999`);

  // Show remaining confirmed bookings so you can see what's still taken
  const r2 = await pool.query(
    `SELECT b.booking_id, c.phone, s.name_en, b.scheduled_start, b.status
     FROM bookings b
     JOIN customers c ON b.customer_id = c.customer_id
     JOIN services s ON b.service_id = s.service_id
     WHERE b.status = 'confirmed' AND b.scheduled_start > NOW()
     ORDER BY b.scheduled_start ASC`
  );
  if (r2.rows.length === 0) {
    console.log('All future slots are now free.');
  } else {
    console.log('\nRemaining confirmed bookings (real ones):');
    r2.rows.forEach(b => console.log(`  ${b.phone} — ${b.name_en} — ${new Date(b.scheduled_start).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}`));
  }

  await pool.end();
}

cleanup().catch(err => { console.error(err.message); process.exit(1); });
