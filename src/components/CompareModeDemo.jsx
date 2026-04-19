import React, { useState } from 'react';
import { computeRiskScore, decideAction } from '../utils/financialEngine';

const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);

export default function CompareModeDemo({ income, expenses, savings }) {
  const [itemA, setItemA] = useState({ name: 'Car - Used Mehran', price: '800000' });
  const [itemB, setItemB] = useState({ name: 'Motorcycle - Honda CD70', price: '150000' });

  const monthlySurplus = income - expenses;
  const emergencyHigh = expenses * 6;

  const runAnalysis = (priceRaw) => {
    const price = Number(priceRaw) || 0;
    const score = computeRiskScore({
      income, expenses, savings, assetPrice: price, monthlySurplus, emergencyTargetHigh: emergencyHigh, bestEmiPct: 0, downPaymentAmount: 0
    });
    const decision = decideAction({
      riskScore: score, monthlySurplus, savings, assetPrice: price, emergencyTargetHigh: emergencyHigh, bestPlan: null, income, expenses, financingEnabled: false, downPaymentAmount: 0, needsDownPayment: false
    });
    return { score, decision };
  };

  const resultA = runAnalysis(itemA.price);
  const resultB = runAnalysis(itemB.price);

  return (
    <div className="section" style={{ minHeight: '80vh', marginTop: 32 }}>
      <div className="glass-card">
        <div className="section-title">
          <h2>Compare Purchases</h2>
          <span style={{ background: '#a78bfa' }}>VS</span>
        </div>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, marginBottom: 32 }}>
          Weighing two options? See how they impact your financial health side-by-side using your base profile.
        </p>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Option A */}
          <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>Option A</h3>
            <div className="field">
              <label>Item Name</label>
              <input value={itemA.name} onChange={e => setItemA({...itemA, name: e.target.value})} />
            </div>
            <div className="field">
              <label>Price (PKR)</label>
              <input inputMode="numeric" value={itemA.price} onChange={e => setItemA({...itemA, price: e.target.value})} />
            </div>
            
            <div style={{ marginTop: 32, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Risk Score</div>
              <div style={{ fontSize: 36, fontWeight: 700, margin: '8px 0', color: resultA.score > 60 ? '#fb7185' : resultA.score > 30 ? '#fbbf24' : '#5eead4' }}>{resultA.score}</div>
              <div className={`decision-pill \${resultA.decision.key === 'buy' ? 'buy' : resultA.decision.key === 'wait' ? 'wait' : 'cautious'}`} style={{ display: 'inline-flex' }}>
                {resultA.decision.key.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Option B */}
          <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0 }}>Option B</h3>
            <div className="field">
              <label>Item Name</label>
              <input value={itemB.name} onChange={e => setItemB({...itemB, name: e.target.value})} />
            </div>
            <div className="field">
              <label>Price (PKR)</label>
              <input inputMode="numeric" value={itemB.price} onChange={e => setItemB({...itemB, price: e.target.value})} />
            </div>
            
            <div style={{ marginTop: 32, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Risk Score</div>
              <div style={{ fontSize: 36, fontWeight: 700, margin: '8px 0', color: resultB.score > 60 ? '#fb7185' : resultB.score > 30 ? '#fbbf24' : '#5eead4' }}>{resultB.score}</div>
              <div className={`decision-pill \${resultB.decision.key === 'buy' ? 'buy' : resultB.decision.key === 'wait' ? 'wait' : 'cautious'}`} style={{ display: 'inline-flex' }}>
                {resultB.decision.key.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
