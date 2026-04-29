import { query } from "@/lib/db";
import { format } from "date-fns";
import { Phone, PhoneIncoming, PhoneOutgoing, Info } from "lucide-react";

async function getCalls() {
  const result = await query(`
    SELECT call_id, caller_phone, language_code, current_state, outcome, created_at, selected_service_code
    FROM calls
    ORDER BY created_at DESC
    LIMIT 20
  `);
  return result.rows;
}

export default async function CallsPage() {
  const calls = await getCalls();

  return (
    <div>
      <header className="header">
        <div>
          <h1 className="header-title">Call History</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Review recent IVR interactions and outcomes.
          </p>
        </div>
      </header>

      <div className="content-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Caller</th>
                <th>Language</th>
                <th>Last State</th>
                <th>Service Intent</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.call_id}>
                  <td style={{ color: 'var(--muted-foreground)' }}>
                    {format(new Date(call.created_at), 'MMM d, h:mm:ss a')}
                  </td>
                  <td style={{ fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} />
                      {call.caller_phone}
                    </div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: 'var(--muted)', padding: '2px 6px', borderRadius: '4px' }}>
                      {call.language_code}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{call.current_state}</td>
                  <td>{call.selected_service_code || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`status-badge ${call.outcome === 'booking_confirmed' ? 'status-confirmed' : ''}`}>
                        {call.outcome || 'Abandoned'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No calls recorded yet.
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
