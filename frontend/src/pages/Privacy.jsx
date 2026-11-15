import React from 'react';
import { Shield } from 'lucide-react';
import '../styles/pages.css';

const Privacy = () => {
  return (
    <div className="internal-page">
      <div className="page-header" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px auto' }}>
        <Shield size={48} color="var(--color-accent)" style={{ margin: '0 auto 20px auto' }} />
        <h1>Privacy Policy & Data Protection</h1>
        <p style={{ color: 'var(--text-light)', marginTop: '10px' }}>
          Last Updated: November 2026
        </p>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--bg-white)', padding: '50px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--border-light)', lineHeight: '1.8', color: 'var(--text-color)' }}>
        
        <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem', marginBottom: '15px' }}>1. Information We Collect</h3>
        <p style={{ marginBottom: '30px' }}>
          At Derma Aline, we collect personal information strictly necessary for providing dermatology and aesthetic services. This includes your full name, email address, phone number, and any specific medical concerns you share via our booking platform.
        </p>

        <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem', marginBottom: '15px' }}>2. How We Use Your Data</h3>
        <p style={{ marginBottom: '30px' }}>
          Your data is securely transmitted to our HIPAA-compliant database structure. We use this data exclusively to:
          <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>Schedule and manage your clinical appointments.</li>
            <li>Send you important notifications regarding your bookings (confirmations, cancellations).</li>
            <li>Respond to your direct inquiries via our contact form.</li>
          </ul>
        </p>

        <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem', marginBottom: '15px' }}>3. Security & Access Control</h3>
        <p style={{ marginBottom: '30px' }}>
          Your data is protected by industry-standard cryptographic techniques, including BCrypt password hashing and JWT (JSON Web Token) stateless authentication. Our backend PostgreSQL databases enforce strict isolation so patients can only access their own history, and clinical data is only accessible to verified administrators.
        </p>

        <h3 style={{ color: 'var(--color-primary)', fontSize: '1.3rem', marginBottom: '15px' }}>4. Your Rights</h3>
        <p style={{ marginBottom: '30px' }}>
          You have the right to request access to the data we hold about you, request corrections, or ask for the deletion of your account and related booking records by contacting <b>admin@dermaaline.com</b>.
        </p>
      </div>
    </div>
  );
};

export default Privacy;