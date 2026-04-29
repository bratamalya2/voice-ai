import { query } from "@/lib/db";
import { format } from "date-fns";
import QuoteForm from "./QuoteForm";

async function getBusinesses() {
  const result = await query("SELECT business_id, business_name, business_type FROM businesses WHERE active = TRUE");
  return result.rows;
}

async function getServices() {
  const result = await query("SELECT service_id, business_id, name_en, service_code FROM services WHERE active = TRUE");
  return result.rows;
}

export default async function QuotePage() {
  const businesses = await getBusinesses();
  const services = await getServices();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Instant Quote
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '1.125rem' }}>
            Get an estimate for your service in seconds.
          </p>
        </header>

        <div className="content-card" style={{ padding: '2.5rem' }}>
          <QuoteForm businesses={businesses} services={services} />
        </div>
      </div>
    </div>
  );
}
