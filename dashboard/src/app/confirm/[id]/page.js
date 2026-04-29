import { query } from "@/lib/db";
import { format } from "date-fns";
import { CheckCircle2, Calendar, MapPin, Clock, Phone } from "lucide-react";
import Link from "next/link";

async function getBooking(id) {
  const result = await query(`
    SELECT b.*, c.full_name, c.phone, s.name_en as service_name, biz.business_name, biz.twilio_number
    FROM bookings b
    JOIN customers c ON b.customer_id = c.customer_id
    JOIN services s ON b.service_id = s.service_id
    JOIN businesses biz ON b.business_id = biz.business_id
    WHERE b.booking_id = $1
  `, [id]);
  return result.rows[0];
}

export default async function ConfirmationPage({ params }) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) return <div style={{ color: 'white', padding: '4rem', textAlign: 'center' }}>Booking not found</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <div className="content-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: '#4ade80' }}>
            <CheckCircle2 size={48} />
          </div>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Booking Confirmed!</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Thank you for booking with {booking.business_name}. We've sent a confirmation to your phone.
          </p>

          <div style={{ textAlign: 'left', backgroundColor: 'var(--muted)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Calendar size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Date & Time</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{format(new Date(booking.scheduled_start), 'EEEE, MMMM d')} at {format(new Date(booking.scheduled_start), 'h:mm a')}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Clock size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Service</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{booking.service_name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Phone size={18} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Your Contact</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{booking.phone}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <Link href="/" className="btn btn-primary" style={{ padding: '1rem' }}>
              Add to Calendar
            </Link>
            <Link href={`/cancel/${booking.booking_id}`} className="btn" style={{ padding: '1rem', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'white' }}>
              Manage Booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
