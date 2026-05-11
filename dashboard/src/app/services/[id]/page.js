import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";

async function getService(id) {
  const result = await query("SELECT * FROM services WHERE service_id = $1", [id]);
  return result.rows[0];
}

async function updateService(formData) {
  "use server";
  
  const id = formData.get("id");
  const name_en = formData.get("name_en");
  const duration = parseInt(formData.get("duration"));
  const price_min = parseFloat(formData.get("price_min"));
  const price_max = parseFloat(formData.get("price_max"));
  const active = formData.get("active") === "on";

  await query(
    `UPDATE services
     SET name_en = $1, duration_minutes = $2, base_price_min = $3, base_price_max = $4, active = $5
     WHERE service_id = $6`,
    [name_en, duration, price_min, price_max, active, id]
  );

  revalidatePath("/services");
  redirect("/services");
}

export default async function EditServicePage({ params }) {
  const { id } = await params;
  const service = await getService(id);

  if (!service) return <div>Service not found</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/services" className="nav-link" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="header-title">Edit Service</h1>
            <p style={{ color: 'var(--muted-foreground)' }}>{service.service_code}</p>
          </div>
        </div>
      </header>

      <form action={updateService} className="content-card" style={{ padding: '2rem' }}>
        <input type="hidden" name="id" value={service.service_id} />
        
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Service Name (English)</label>
            <input 
              name="name_en"
              defaultValue={service.name_en}
              className="btn"
              style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Duration (minutes)</label>
              <input 
                name="duration"
                type="number"
                defaultValue={service.duration_minutes}
                className="btn"
                style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="active" defaultChecked={service.active} style={{ width: '1.25rem', height: '1.25rem' }} />
                <span>Active and visible in IVR</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Min Price ($)</label>
              <input 
                name="price_min"
                type="number"
                step="0.01"
                defaultValue={service.base_price_min}
                className="btn"
                style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Max Price ($)</label>
              <input 
                name="price_max"
                type="number"
                step="0.01"
                defaultValue={service.base_price_max}
                className="btn"
                style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', cursor: 'text' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
              <Save size={18} />
              Save Changes
            </button>
            <Link href="/services" className="btn" style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'white', padding: '0.75rem 2rem' }}>
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
