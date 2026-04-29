"use client";

import { useState, useEffect } from "react";
import { fetchAvailableSlots, rescheduleBooking } from "../actions";
import { Loader2, Calendar } from "lucide-react";

export default function RescheduleForm({ booking }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      const available = await fetchAvailableSlots(booking.business_id, booking.duration_minutes);
      setSlots(available);
      setLoading(false);
    }
    loadSlots();
  }, [booking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    await rescheduleBooking(booking.booking_id, selectedSlot);
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto' }} />
      <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)' }}>Finding new times for you...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600' }}>Choose a New Time</label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {slots.map((slot) => (
            <label 
              key={slot.start} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '1rem', 
                backgroundColor: selectedSlot === slot.start ? 'var(--primary)' : 'var(--muted)', 
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="radio" 
                name="slot" 
                value={slot.start} 
                onChange={(e) => setSelectedSlot(e.target.value)}
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'white' }}
              />
              <span style={{ fontWeight: '500', color: 'white' }}>{slot.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button 
          type="submit" 
          disabled={!selectedSlot || submitting}
          className="btn btn-primary" 
          style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (!selectedSlot || submitting) ? 0.5 : 1 }}
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
          {submitting ? 'Updating...' : 'Confirm New Time'}
        </button>
      </div>
    </form>
  );
}
