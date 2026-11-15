import React from 'react';
import { Sparkles, Shield, Award } from 'lucide-react';
import '../styles/pages.css';

const About = () => {
  return (
    <div className="internal-page">
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
        <Sparkles size={36} color="var(--color-accent)" style={{ marginBottom: '15px' }} />
        <h1>About Derma Aline Aesthetics</h1>
        <p style={{ color: 'var(--text-light)', maxWidth: '700px', margin: '10px auto 0 auto' }}>
          Where advanced medical dermatology meets luxurious comfort in the heart of Rajouri Garden, New Delhi.
        </p>
      </div>

      {/* Main Split Section: Square Image on Left, Text & Details on Right */}
      <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '60px' }}>
        
        {/* Left Side: Square Clinic Interior Image */}
        <div style={{ flex: '1', minWidth: '350px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ aspectRatio: '1 / 1', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', backgroundColor: 'var(--bg-white)' }}>
            <img 
              src="/clinic-interior.webp" 
              alt="Derma Aline Clinic Interior" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', imageRendering: 'crisp-edges' }} 
            />
          </div>
        </div>

        {/* Right Side: Philosophy & Info */}
        <div style={{ flex: '1.2', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', color: 'var(--color-primary)', fontFamily: 'var(--font-heading)', marginBottom: '15px' }}>
              Our Philosophy & Vision
            </h2>
            <p style={{ color: 'var(--text-main)', lineHeight: '1.8', marginBottom: '15px', fontSize: '1.05rem' }}>
              Founded with a passion for flawless skin and natural beauty, <strong>Derma Aline Aesthetics</strong> is a premier skin clinic dedicated to delivering bespoke dermatological and aesthetic treatments. 
            </p>
            <p style={{ color: 'var(--text-light)', lineHeight: '1.8', fontSize: '1rem' }}>
              Located in the vibrant Main Market of Rajouri Garden, New Delhi, our clinic combines state-of-the-art FDA-approved technologies with a serene, luxurious ambiance to ensure every patient receives personalized care of the highest international standards.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ backgroundColor: 'var(--bg-white)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <Shield size={24} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '3px' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '5px' }}>Medical Safety First</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Strict adherence to hygiene, sanitized environments, and expert-led supervision for all procedures.</p>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-white)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-soft)', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <Award size={24} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '3px' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '5px' }}>Bespoke Treatments</h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Every skin type is unique; our customized treatment regimens target your specific skin goals effectively.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;