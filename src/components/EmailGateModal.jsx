import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailGateModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    // Simulate network request
    setTimeout(() => {
      localStorage.setItem('spendwise_user_email', email);
      setLoading(false);
      onSuccess(email);
    }, 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="pdf-modal-backdrop" style={{ zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass-card modal-content"
            style={{ maxWidth: 400, width: '100%', margin: 'auto', position: 'relative', marginTop: '15vh' }}
          >
            <button 
              type="button" 
              className="btn-ghost btn-compact" 
              style={{ position: 'absolute', top: 12, right: 12 }}
              onClick={onClose}
            >
              Close
            </button>
            <h3 style={{ marginTop: 10, marginBottom: 12 }}>Unlock Spend Wise Pro</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              Enter your email to save this analysis, retrieve it later, and unlock the full PDF report download.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label htmlFor="gate-email">Email address</label>
                <input
                  id="gate-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? 'Unlocking...' : 'Unlock Now'}
              </button>
            </form>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16, textAlign: 'center' }}>
              We'll never share your email. Free tier forever.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
