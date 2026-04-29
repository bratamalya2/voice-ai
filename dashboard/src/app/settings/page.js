import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Save, Building2, Mail, Globe, Clock } from "lucide-react";

async function getBusinessSettings() {
  // For demo, we just get the first business
  const result = await query("SELECT * FROM businesses LIMIT 1");
  return result.rows[0];
}

async function updateSettings(formData) {
  "use server";
  
  const id = formData.get("id");
  const name = formData.get("name");
  const email = formData.get("email");
  const timezone = formData.get("timezone");

  await query(
    `UPDATE businesses 
     SET business_name = $1, provider_email = $2, timezone = $3, updated_at = NOW()
     WHERE business_id = $4`,
    [name, email, timezone, id]
  );

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const business = await getBusinessSettings();

  if (!business) return <div>Business not found</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <header className="header">
        <div>
          <h1 className="header-title">Settings</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Manage your business profile and global preferences.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gap: '2rem' }}>
        <form action={updateSettings} className="content-card">
          <div className="card-header">
            <h2 className="card-title">Business Profile</h2>
          </div>
          <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
            <input type="hidden" name="id" value={business.business_id} />
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Business Name</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input 
                  name="name"
                  defaultValue={business.business_name}
                  className="btn"
                  style={{ width: '100%', paddingLeft: '2.5rem', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Notification Email (Provider)</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <input 
                  name="email"
                  type="email"
                  defaultValue={business.provider_email}
                  className="btn"
                  style={{ width: '100%', paddingLeft: '2.5rem', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Timezone</label>
              <div style={{ position: 'relative' }}>
                <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                <select 
                  name="timezone"
                  defaultValue={business.timezone}
                  className="btn"
                  style={{ width: '100%', paddingLeft: '2.5rem', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="Australia/Melbourne">Australia/Melbourne</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                <Save size={18} />
                Save Settings
              </button>
            </div>
          </div>
        </form>

        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">Twilio Integration</h2>
          </div>
          <div style={{ padding: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Your active Twilio number is currently receiving calls.
            </p>
            <div style={{ padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
              {business.twilio_number || 'No number assigned'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
