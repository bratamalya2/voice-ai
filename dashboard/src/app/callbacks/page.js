import { query } from "@/lib/db";
import { format } from "date-fns";
import { MessageSquare, CheckCircle2, Clock } from "lucide-react";

async function getCallbacks() {
  const result = await query(`
    SELECT callback_id, phone, language_code, reason, status, created_at
    FROM callback_requests
    ORDER BY created_at DESC
  `);
  return result.rows;
}

export default async function CallbacksPage() {
  const callbacks = await getCallbacks();

  return (
    <div>
      <header className="header">
        <div>
          <h1 className="header-title">Callback Requests</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Follow up with customers who requested a callback.
          </p>
        </div>
      </header>

      <div className="content-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Requested At</th>
                <th>Customer Phone</th>
                <th>Language</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {callbacks.map((cb) => (
                <tr key={cb.callback_id}>
                  <td style={{ color: 'var(--muted-foreground)' }}>
                    {format(new Date(cb.created_at), 'MMM d, h:mm a')}
                  </td>
                  <td style={{ fontWeight: '500' }}>{cb.phone}</td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', backgroundColor: 'var(--muted)', padding: '2px 6px', borderRadius: '4px' }}>
                      {cb.language_code}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cb.reason || 'General Enquiry'}
                  </td>
                  <td>
                    <span className={`status-badge status-${cb.status}`}>
                      {cb.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn" style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent)', color: 'white' }}>
                      Mark Resolved
                    </button>
                  </td>
                </tr>
              ))}
              {callbacks.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
                    No callback requests found.
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
