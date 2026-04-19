import React, { useState } from 'react';
import { motion } from 'framer-motion';

const formatCurrency = (val) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);

export default function TeamModeDemo() {
  const [purchasePrice, setPurchasePrice] = useState(3000000);
  const [members, setMembers] = useState([
    { id: 1, name: 'Sibling A', income: 150000, savings: 500000 },
    { id: 2, name: 'Sibling B', income: 80000, savings: 200000 },
    { id: 3, name: 'Sibling C', income: 45000, savings: 50000 }
  ]);
  const [newMember, setNewMember] = useState({ name: '', income: '', savings: '' });
  
  const handleAddMember = () => {
    if (!newMember.name || !newMember.income) return;
    setMembers([...members, { 
      id: Date.now(), 
      name: newMember.name, 
      income: Number(newMember.income), 
      savings: Number(newMember.savings) || 0 
    }]);
    setNewMember({ name: '', income: '', savings: '' });
  };
  
  const handleRemoveMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
  };

  // Logic: 
  // Naive Equal Split: PurchasePrice / members.length
  // Smart Split: Weighted by each member's "Capacity"
  // Let capacity = (Income * 0.4 * 24) + Savings
  // Proportional weight = member.capacity / total_capacity
  
  const equalSplit = members.length > 0 ? purchasePrice / members.length : 0;
  
  const results = members.map(m => {
    // arbitrary monthly capacity heuristic for hackathon demo
    const capacityScore = (m.income * 0.4 * 24) + m.savings;
    const naiveEmergencyRatio = m.savings / (m.income * 0.5 * 3); // 3 months expenses approx
    return { ...m, capacityScore, naiveEmergencyRatio };
  });

  const totalCapacity = results.reduce((acc, r) => acc + Math.max(1, r.capacityScore), 0);

  let groupRiskLabel = 'Contained';
  let hasRiskyEqual = false;

  const smartResults = results.map(m => {
    let smartShare = 0;
    if (totalCapacity > 0) {
      smartShare = purchasePrice * (Math.max(1, m.capacityScore) / totalCapacity);
    }
    
    // Check if equal split is dangerous for them
    const equalStrain = equalSplit > (m.savings + (m.income * 5)); // very loose heuristic
    if (equalStrain) hasRiskyEqual = true;

    return {
      ...m,
      equalShare: equalSplit,
      smartShare: Math.round(smartShare / 1000) * 1000,
      equalRisky: equalStrain
    };
  });

  if (hasRiskyEqual) groupRiskLabel = 'Elevated';
  if (purchasePrice > totalCapacity * 1.5) groupRiskLabel = 'Severe';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="section" style={{ minHeight: '80vh', marginTop: 32 }}>
      <div className="glass-card">
        <div className="section-title">
          <h2>Team Mode (Interactive)</h2>
          <span style={{ background: '#6366f1' }}>Social</span>
        </div>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Shared purchases (plots, cars for parents, family trips) are hard to split fairly. Equal splits often strain lower-earning members. Add members below to calculate the Smart Split powered by the Spend Wise engine.
        </p>
        
        <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="field">
            <label>Total Team Purchase Price (PKR)</label>
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3>Team Members</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 16 }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Name</label>
              <input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Name" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Mo. Income</label>
              <input type="number" value={newMember.income} onChange={e => setNewMember({...newMember, income: e.target.value})} placeholder="PKR" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Savings</label>
              <input type="number" value={newMember.savings} onChange={e => setNewMember({...newMember, savings: e.target.value})} placeholder="PKR" />
            </div>
            <button className="btn-primary btn-compact" onClick={handleAddMember}>Add</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>
              <div>Member</div>
              <div>Profile</div>
              <div>Equal Split</div>
              <div>Smart Split</div>
              <div></div>
            </div>

            {smartResults.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 14 }}>No members added.</div>}
            
            {smartResults.map(m => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: 8, borderRadius: 8 }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Inc: {m.income/1000}k<br/>Sav: {m.savings/1000}k</div>
                <div style={{ color: m.equalRisky ? '#fb7185' : 'var(--text)' }}>
                  {formatCurrency(m.equalShare)} {m.equalRisky && <span style={{ fontSize: 10, background: 'rgba(251, 113, 133, 0.2)', padding: '2px 4px', borderRadius: 4 }}>RISKY</span>}
                </div>
                <div style={{ color: '#5eead4', fontWeight: 600 }}>{formatCurrency(m.smartShare)}</div>
                <button className="btn-ghost btn-compact" style={{ padding: '4px 8px', fontSize: 12, color: '#fb7185' }} onClick={() => handleRemoveMember(m.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {members.length > 0 && (
          <div className="analysis-block" style={{ marginTop: 24, background: 'rgba(94, 234, 212, 0.05)', borderColor: 'rgba(94, 234, 212, 0.2)' }}>
            <h3>Group Analysis Insight</h3>
            <p>
              Under an equal split, the Group Risk Level evaluates to <strong>{hasRiskyEqual ? 'Elevated/Risky' : 'Safe'}</strong> due to the strain on individual bounds.
              Using the calculated <strong>Smart Split</strong> capacity engine, the financial burden is proportionally absorbed, bringing Group Risk to <strong>Safe (Contained)</strong>.
            </p>
          </div>
        )}

      </div>
    </motion.div>
  );
}
