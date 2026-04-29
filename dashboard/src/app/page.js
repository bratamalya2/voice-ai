import { query } from "@/lib/db";
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  DollarSign, 
  ArrowUpRight 
} from "lucide-react";
import { format } from "date-fns";

async function getStats() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = format(tomorrow, 'yyyy-MM-dd') + ' 00:00:00';
  const tomorrowEnd = format(tomorrow, 'yyyy-MM-dd') + ' 23:59:59';

  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as total_active,
      (SELECT COUNT(*) FROM bookings WHERE scheduled_start >= $1 AND scheduled_start <= $2 AND status = 'confirmed') as tomorrow_count,
      (SELECT COUNT(*) FROM callback_requests WHERE status = 'pending') as pending_callbacks,
      (SELECT COALESCE(SUM(quote_min), 0) FROM bookings WHERE status = 'confirmed') as estimated_revenue
  `, [tomorrowStart, tomorrowEnd]);

  const recentBookings = await query(`
    SELECT b.booking_id, b.scheduled_start, b.status, c.full_name, s.name_en as service_name
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    JOIN services s ON b.service_id = s.service_id
    ORDER BY b.created_at DESC
    LIMIT 5
  `);

  return {
    overview: stats.rows[0],
    recentBookings: recentBookings.rows
  };
}

export default async function DashboardPage() {
  const { overview, recentBookings } = await getStats();

  return (
    <div>
      <header className="header">
        <div>
          <h1 className="header-title">Dashboard Overview</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Welcome back! Here is what's happening with your bookings.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowUpRight size={16} />
          View Reports
        </button>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Tomorrow's Bookings</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">{overview.tomorrow_count}</div>
            <Clock size={24} color="var(--primary)" />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Active Bookings</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">{overview.total_active}</div>
            <CalendarCheck size={24} color="#10b981" />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Estimated Revenue</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">${Math.round(overview.estimated_revenue)}</div>
            <DollarSign size={24} color="#f59e0b" />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Callbacks</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="stat-value">{overview.pending_callbacks}</div>
            <Users size={24} color="#6366f1" />
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Recent Bookings</h2>
          <a href="/bookings" style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600' }}>View all</a>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Scheduled Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr key={booking.booking_id}>
                  <td style={{ fontWeight: '500' }}>{booking.full_name || 'Anonymous'}</td>
                  <td>{booking.service_name}</td>
                  <td>{format(new Date(booking.scheduled_start), 'MMM d, h:mm a')}</td>
                  <td>
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No recent bookings found.
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
