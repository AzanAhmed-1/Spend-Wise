import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareCardModal({ isOpen, onClose, verdict, verdictClass, riskScore, price, assetName }) {
  const cardRef = useRef(null);

  const formattedPrice = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(price || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="pdf-modal-backdrop" style={{ zIndex: 9999 }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="share-wrapper"
            style={{ maxWidth: 360, width: '100%', margin: 'auto', position: 'relative', marginTop: '10vh' }}
          >
            <div 
              ref={cardRef}
              style={{
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                borderRadius: 20,
                padding: 32,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative elements */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'var(--accent-primary)', opacity: 0.2, filter: 'blur(50px)', borderRadius: '50%' }}></div>
              <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'var(--accent-secondary)', opacity: 0.2, filter: 'blur(50px)', borderRadius: '50%' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>Spend Wise</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Purchase Check</div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Verdict</div>
                <div className={`decision-pill \${verdictClass}`} style={{ display: 'inline-flex', fontSize: 24, padding: '8px 24px' }}>
                  {verdict}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Risk Score</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: riskScore > 60 ? '#fb7185' : riskScore > 30 ? '#fbbf24' : '#5eead4' }}>
                    {riskScore}<span style={{ fontSize: 16 }}>/100</span>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Item Price</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{formattedPrice}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assetName || 'Asset'}</div>
                </div>
              </div>

              <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                spendwise.finance
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
