import { query } from "@/lib/db";
import { format } from "date-fns";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getBooking(id) {
  const result = await query(`
    SELECT b.*, s.name_en as service_name, biz.business_name
    FROM bookings b
    JOIN services s ON b.service_id = s.service_id
    JOIN businesses biz ON b.business_id = biz.business_id
    WHERE b.booking_id = $1
  `, [id]);
  return result.rows[0];
}

async function cancelBookingAction(formData) {
  "use server";
  const id = formData.get("id");
  
  await query(
    "UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = $1",
    [id]
  );
  
  revalidatePath(`/confirm/${id}`);
  redirect(`/cancel/${id}/success`);
}

export default async function CancelBookingPage({ params }) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) return <div style={{ color: 'white', padding: '4rem', textAlign: 'center' }}>Booking not found</div>;
  if (booking.status === 'cancelled') redirect(`/cancel/${id}/success`);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <div className="content-card" style={{ padding: '2.5rem' }}>
          <div style={{ color: '#ef4444', marginBottom: '1.5rem' }}>
            <AlertTriangle size={48} />
          </div>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Cancel Appointment?</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            You are about to cancel your <strong>{booking.service_name}</strong> with {booking.business_name} scheduled for {format(new Date(booking.scheduled_start), 'MMMM d, h:mm a')}.
          </p>

          <form action={cancelBookingAction} style={{ display: 'grid', gap: '1rem' }}>
            <input type="hidden" name="id" value={booking.booking_id} />
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Reason for cancellation (optional)</label>
              <textarea 
                name="reason"
                className="btn"
                style={{ width: '100%', minHeight: '100px', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text', padding: '1rem' }}
                placeholder="Let us know why you are cancelling..."
              ></textarea>
            </div>

            <button type="submit" className="btn" style={{ padding: '1rem', backgroundColor: '#ef4444', color: 'white' }}>
              Confirm Cancellation
            </button>
            <Link href={`/confirm/${booking.booking_id}`} className="btn" style={{ padding: '1rem', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'white', textAlign: 'center' }}>
              Keep Booking
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
