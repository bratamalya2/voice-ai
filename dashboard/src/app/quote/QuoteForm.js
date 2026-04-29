"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChevronRight } from "lucide-react";

export default function QuoteForm({ businesses, services }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    businessId: "",
    serviceId: "",
    vehicleType: "sedan",
    condition: "average",
    propertyType: "house",
    bedrooms: 3,
    bathrooms: 2
  });

  const selectedBusiness = businesses.find(b => b.business_id === formData.businessId);
  const businessServices = services.filter(s => s.business_id === formData.businessId);

  const getQuote = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // For demo purposes, we simulate the quote calculation
      // In production, this calls our n8n quote-engine
      await new Promise(r => setTimeout(r, 1500));
      
      const service = services.find(s => s.service_id === formData.serviceId);
      
      let min = 100, max = 200;
      if (selectedBusiness?.business_type === 'car_detailing') {
        if (formData.vehicleType === 'suv') { min += 50; max += 100; }
        if (formData.condition === 'poor') { min += 80; max += 150; }
      } else {
        min = formData.bedrooms * 60 + formData.bathrooms * 40;
        max = min + 100;
      }

      setResult({ min, max });
      setStep(3);
    } catch (err) {
      alert("Failed to get quote");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Select Business</label>
          <select 
            className="btn" 
            style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', appearance: 'none', padding: '1rem' }}
            onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
            value={formData.businessId}
          >
            <option value="">Choose a business...</option>
            {businesses.map(b => (
              <option key={b.business_id} value={b.business_id}>{b.business_name}</option>
            ))}
          </select>
        </div>

        {formData.businessId && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Select Service</label>
            <select 
              className="btn" 
              style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left', appearance: 'none', padding: '1rem' }}
              onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
              value={formData.serviceId}
            >
              <option value="">Choose a service...</option>
              {businessServices.map(s => (
                <option key={s.service_id} value={s.service_id}>{s.name_en}</option>
              ))}
            </select>
          </div>
        )}

        <button 
          disabled={!formData.serviceId}
          onClick={() => setStep(2)}
          className="btn btn-primary" 
          style={{ marginTop: '1rem', width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: formData.serviceId ? 1 : 0.5 }}
        >
          Next Details
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={getQuote} style={{ display: 'grid', gap: '1.5rem' }}>
        {selectedBusiness.business_type === 'car_detailing' ? (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Vehicle Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {['sedan', 'suv', 'van'].map(type => (
                  <button 
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, vehicleType: type })}
                    className="btn"
                    style={{ backgroundColor: formData.vehicleType === type ? 'var(--primary)' : 'var(--muted)', border: '1px solid var(--border)', color: 'white', textTransform: 'capitalize' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Condition</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['average', 'poor'].map(cond => (
                  <button 
                    key={cond}
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: cond })}
                    className="btn"
                    style={{ backgroundColor: formData.condition === cond ? 'var(--primary)' : 'var(--muted)', border: '1px solid var(--border)', color: 'white', textTransform: 'capitalize' }}
                  >
                    {cond === 'average' ? 'Standard' : 'Heavy Dirt'}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
             <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Bedrooms</label>
              <input 
                type="number" 
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="btn"
                style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>Bathrooms</label>
              <input 
                type="number" 
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="btn"
                style={{ width: '100%', backgroundColor: 'var(--muted)', border: '1px solid var(--border)', color: 'white', textAlign: 'left' }}
              />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => setStep(1)} className="btn" style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'white' }}>
            Back
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="btn btn-primary" 
            style={{ flex: 2, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? 'Calculating...' : 'Get Instant Quote'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Your Estimated Quote</div>
        <div style={{ fontSize: '3.5rem', fontWeight: '800', color: 'white' }}>
          ${result.min} – ${result.max}
        </div>
      </div>
      
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
        Ready to book? You can call us or book online using the button below.
      </p>

      <button className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem' }}>
        Book This Now
      </button>
      
      <button 
        onClick={() => setStep(1)}
        className="btn" 
        style={{ marginTop: '1rem', width: '100%', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'white' }}
      >
        Start Over
      </button>
    </div>
  );
}
