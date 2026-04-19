import React from 'react';

export default function EmiCalendar({ emiTermMonths, monthlyEmi }) {
  if (!emiTermMonths || emiTermMonths === 0 || !monthlyEmi) return null;

  const formattedEmi = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(monthlyEmi);

  // Generate an array of months based on current date
  const months = [];
  const start = new Date();
  start.setMonth(start.getMonth() + 1); // Start next month
  
  for (let i = 0; i < emiTermMonths; i++) {
    const d = new Date(start.getTime());
    d.setMonth(start.getMonth() + i);
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      amount: formattedEmi,
      key: i
    });
  }

  return (
    <div className="analysis-block" style={{ marginTop: 32 }}>
      <h3>Amortization Calendar</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>
        Your commitment over the next {emiTermMonths} months.
      </p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
        gap: 8,
        marginTop: 16,
        maxHeight: 240,
        overflowY: 'auto',
        paddingRight: 8
      }}>
        {months.map(m => (
          <div key={m.key} style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '12px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
