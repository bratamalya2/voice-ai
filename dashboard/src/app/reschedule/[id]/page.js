import { query } from "@/lib/db";
import { format } from "date-fns";
import RescheduleForm from "./RescheduleForm";

async function getBooking(id) {
  const result = await query(`
    SELECT b.*, s.name_en as service_name, s.duration_minutes, biz.business_name, biz.calendar_id
    FROM bookings b
    JOIN services s ON b.service_id = s.service_id
    JOIN businesses biz ON b.business_id = biz.business_id
    WHERE b.booking_id = $1
  `, [id]);
  return result.rows[0];
}

export default async function ReschedulePage({ params }) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) return <div style={{ color: 'white', padding: '4rem', textAlign: 'center' }}>Booking not found</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>
            Reschedule Appointment
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Currently scheduled for: {format(new Date(booking.scheduled_start), 'EEEE, MMMM d, h:mm a')}
          </p>
        </header>

        <div className="content-card" style={{ padding: '2.5rem' }}>
          <RescheduleForm booking={booking} />
        </div>
      </div>
    </div>
  );
}
