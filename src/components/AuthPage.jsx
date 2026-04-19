import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('signup'); // 'signup' or 'login'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    if (mode === 'signup' && !name) return;
    
    // Mock login/signup
    onLogin({ 
      name: mode === 'signup' ? name : email.split('@')[0], 
      email, 
      isGuest: false 
    });
  };

  const handleGuest = () => {
    onLogin({ name: 'Guest', email: '', isGuest: true });
  };

  return (
    <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
        className="glass-card" style={{ maxWidth: 400, width: '100%', padding: 40 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: '-1px' }}>Spend Wise</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>Smarter Purchase Decisions.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div className="field">
              <label>Your Name</label>
              <input type="text" placeholder="Ali Raza" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 8 }}>
            {mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button 
            type="button" 
            className="btn-ghost btn-compact" 
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup' ? 'Already have an account? Log in' : 'Need an account? Sign up'}
          </button>
        </div>

        <div style={{ position: 'relative', margin: '32px 0 24px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
          <span style={{ position: 'relative', background: '#0f172a', padding: '0 12px', color: 'var(--muted)', fontSize: 12 }}>OR</span>
        </div>

        <button type="button" className="btn-ghost" onClick={handleGuest} style={{ width: '100%', justifyContent: 'center' }}>
          Continue as Guest
        </button>
      </motion.div>
    </div>
  );
}
