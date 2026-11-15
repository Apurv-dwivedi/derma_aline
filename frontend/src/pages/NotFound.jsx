import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const NotFound = () => {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
      <Sparkles size={50} color="var(--color-primary)" style={{ marginBottom: '20px', opacity: 0.5 }} />
      <h1 style={{ fontSize: '4rem', color: 'var(--color-primary)', marginBottom: '10px' }}>404</h1>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '20px' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: '30px', maxWidth: '400px' }}>
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      <Link to="/">
        <button className="btn-primary">Return to Home</button>
      </Link>
    </div>
  );
};

export default NotFound;
