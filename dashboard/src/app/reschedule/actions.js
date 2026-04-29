"use server";

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// For demo purposes, we generate some mock slots
// In production, this would call calendlyService.getAvailableSlots()
export async function fetchAvailableSlots(businessId, duration) {
  const slots = [];
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);

  for (let i = 0; i < 5; i++) {
    const time = new Date(start);
    time.setHours(start.getHours() + i);
    slots.push({
      start: time.toISOString(),
      label: time.toLocaleString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    });
  }
  
  return slots;
}

export async function rescheduleBooking(bookingId, newSlotStart) {
  const newStart = new Date(newSlotStart);
  // Assume 1 hour duration if not specified
  const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

  await query(
    `UPDATE bookings 
     SET scheduled_start = $1, scheduled_end = $2, status = 'confirmed', updated_at = NOW()
     WHERE booking_id = $3`,
    [newStart.toISOString(), newEnd.toISOString(), bookingId]
  );

  revalidatePath(`/confirm/${bookingId}`);
  redirect(`/confirm/${bookingId}`);
}
