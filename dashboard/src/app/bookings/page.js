import { query } from "@/lib/db";
import { format } from "date-fns";
import { Search, Filter } from "lucide-react";

async function getBookings() {
  const result = await query(`
    SELECT b.booking_id, b.scheduled_start, b.status, c.full_name, c.phone, s.name_en as service_name, b.quote_min, b.quote_max, b.created_at
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    JOIN services s ON b.service_id = s.service_id
    ORDER BY b.scheduled_start DESC
  `);
  return result.rows;
}

export default async function BookingsPage() {
  const bookings = await getBookings();

  return (
    <div>
      <header className="header">
        <div>
          <h1 className="header-title">All Bookings</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Manage and track all customer appointments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input 
              type="text" 
              placeholder="Search customers..." 
              style={{ 
                padding: '0.5rem 1rem 0.5rem 2.5rem', 
                backgroundColor: 'var(--muted)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)',
                color: 'white',
                outline: 'none'
              }} 
            />
          </div>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--muted)', color: 'white', border: '1px solid var(--border)' }}>
            <Filter size={18} />
            Filter
          </button>
        </div>
      </header>

      <div className="content-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Quote</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.booking_id}>
                  <td style={{ fontWeight: '500' }}>{format(new Date(booking.scheduled_start), 'EEE, MMM d, h:mm a')}</td>
                  <td>
                    <div>{booking.full_name || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{booking.phone}</div>
                  </td>
                  <td>{booking.service_name}</td>
                  <td>${booking.quote_min} - ${booking.quote_max}</td>
                  <td>
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                    {format(new Date(booking.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
