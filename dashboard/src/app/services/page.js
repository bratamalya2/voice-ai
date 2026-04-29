import { query } from "@/lib/db";
import { Wrench, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";

async function getServices() {
  const result = await query(`
    SELECT s.service_id, s.service_code, s.name_en, s.duration_minutes, s.base_price_min, s.base_price_max, s.active, b.business_name
    FROM services s
    JOIN businesses b ON s.business_id = b.business_id
    ORDER BY b.business_name, s.keypad_option
  `);
  return result.rows;
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div>
      <header className="header">
        <div>
          <h1 className="header-title">Service Management</h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
            Configure your offerings, pricing, and durations.
          </p>
        </div>
      </header>

      <div className="content-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Code</th>
                <th>Duration</th>
                <th>Base Pricing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.service_id}>
                  <td style={{ fontWeight: '500' }}>
                    <div>{service.name_en}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{service.business_name}</div>
                  </td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{service.service_code}</td>
                  <td>{service.duration_minutes} mins</td>
                  <td>${service.base_price_min} - ${service.base_price_max}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {service.active ? (
                        <span className="status-badge status-confirmed">Active</span>
                      ) : (
                        <span className="status-badge status-cancelled">Inactive</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link href={`/services/${service.service_id}`} className="btn" style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Edit size={14} />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
