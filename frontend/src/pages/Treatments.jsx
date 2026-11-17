import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock } from 'lucide-react';
import '../styles/pages.css';

const Treatments = () => {
  const treatmentList = [
    {
      id: 1,
      title: "Korean Glass Skin",
      description: "Achieve deep hydration, porcelain texture, and an unmatched luminous glow with our multi-step Korean aesthetic ritual.",
      duration: "60 Mins",
      price: "₹4,500",
      image: "/glass Skin.webp"
    },
    {
      id: 2,
      title: "Skin Booster Therapy",
      description: "Micro-injections of hyaluronic acid and vitamins to deeply nourish, hydrate, and restore youthful radiance from within.",
      duration: "45 Mins",
      price: "₹8,500",
      image: "/skin booster.webp"
    },
    {
      id: 3,
      title: "Aesthetic Injectables & Fillers",
      description: "Precision dermal fillers and anti-wrinkle treatments designed to restore facial volume and smooth fine lines naturally.",
      duration: "45 Mins",
      price: "₹12,000 onwards",
      image: "/injectables.webp"
    },
    {
      id: 4,
      title: "Advanced Laser Hair Reduction",
      description: "Painless, FDA-approved diode laser technology for permanent hair reduction suitable for all skin types.",
      duration: "45 - 90 Mins",
      price: "₹3,500 per session",
      image: "/Laser hair.webp"
    },
    {
      id: 5,
      title: "Advanced Chemical Peel",
      description: "Targeted medical-grade peels to exfoliate dead skin, diminish acne scars, reduce pigmentation, and unveil fresh skin.",
      duration: "45 Mins",
      price: "₹4,000",
      image: "/chemical peel .webp"
    }
  ];

  return (
    <div className="internal-page">
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
        <Sparkles size={36} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
        <h1>Signature Treatments</h1>
        <p style={{ color: 'var(--text-light)', maxWidth: '600px', margin: '10px auto 0 auto' }}>
          Explore our range of medical-grade skincare and aesthetic treatments tailored to enhance your natural beauty.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginBottom: '60px' }}>
        {treatmentList.map((item) => (
          <div key={item.id} style={{ backgroundColor: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', transition: 'transform 0.3s ease' }}>
            
            {/* Treatment Image Container */}
            <div style={{ height: '220px', width: '100%', overflow: 'hidden', position: 'relative' }}>
              <img 
                src={item.image} 
                alt={item.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', imageRendering: 'crisp-edges' }} 
              />
              <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'var(--color-primary)', color: 'var(--bg-cream)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                {item.price}
              </span>
            </div>

            {/* Content Container */}
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', marginBottom: '12px' }}>
                  {item.title}
                </h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
                  {item.description}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  <Clock size={16} color="var(--color-accent)" /> Duration: {item.duration}
                </div>

                <Link to="/contact" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary" style={{ width: '100%', padding: '12px', textAlign: 'center' }}>
                    Enquire This Treatment
                  </button>
                </Link>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default Treatments;