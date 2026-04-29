import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function CancelSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div className="content-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', marginBottom: '1.5rem', color: '#4ade80' }}>
            <CheckCircle2 size={48} />
          </div>
          
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Cancelled Successfully</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Your appointment has been cancelled. We hope to see you again soon!
          </p>

          <Link href="/quote" className="btn btn-primary" style={{ display: 'block', padding: '1rem' }}>
            Book a New Appointment
          </Link>
        </div>
      </div>
    </div>
  );
}
