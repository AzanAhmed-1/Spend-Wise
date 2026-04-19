import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';
import {
  ANNUAL_LOAN_RATE,
  ASSET_TYPES,
  BIG_PURCHASE_THRESHOLD_PKR,
  DOWN_PAYMENT_RATE_OPTIONS,
  EMI_MONTHS_OPTIONS,
  EMI_NONE,
  buildAnalysisReport,
  buildEmiPlans,
  computeRiskScore,
  decideAction,
  formatCurrency,
  pickBestEmiPlan,
  requiresDownPaymentStructure,
  scenarioStress,
} from './utils/financialEngine.js';
import { createPdfBlob } from './utils/pdfReport.js';

import EmailGateModal from './components/EmailGateModal.jsx';
import ShareCardModal from './components/ShareCardModal.jsx';
import TeamModeDemo from './components/TeamModeDemo.jsx';
import CompareModeDemo from './components/CompareModeDemo.jsx';
import EmiCalendar from './components/EmiCalendar.jsx';
import AuthPage from './components/AuthPage.jsx';

const SECTION_IDS = ['inputs', 'engine', 'emi', 'analysis', 'charts'];

const TOOLTIP_PANEL = {
  background: '#0f172a',
  border: '1px solid rgba(148,163,184,0.25)',
  borderRadius: 12,
};

const fadeSlide = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function digitsOnly(value) {
  return String(value).replace(/\D/g, '');
}

function decimalRateOnly(value) {
  let s = String(value).replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const parts = s.split('.');
  if (parts[1] && parts[1].length > 2) s = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return s;
}

const CITIES = [
  { id: 'lahore', name: 'Lahore', median: 65000 },
  { id: 'karachi', name: 'Karachi', median: 72000 },
  { id: 'islamabad', name: 'Islamabad', median: 85000 },
  { id: 'peshawar', name: 'Peshawar', median: 55000 },
  { id: 'quetta', name: 'Quetta', median: 50000 },
  { id: 'other', name: 'Other Region', median: 45000 },
];

function App() {
  const [appUser, setAppUser] = useState(null);
  const [appMode, setAppMode] = useState('personal'); // personal, compare, team

  const [incomeRaw, setIncomeRaw] = useState('85000');
  const [expensesRaw, setExpensesRaw] = useState('42000');
  const [savingsRaw, setSavingsRaw] = useState('320000');
  const [priceRaw, setPriceRaw] = useState('450000');
  const [assetType, setAssetType] = useState(ASSET_TYPES[0].id);
  const [otherAssetLabel, setOtherAssetLabel] = useState('');
  const [interestRateRaw, setInterestRateRaw] = useState('');
  const [emiTermMonths, setEmiTermMonths] = useState(12);
  const [downPaymentRate, setDownPaymentRate] = useState(0.35);
  const [activeSection, setActiveSection] = useState('inputs');
  const [chartTipOverview, setChartTipOverview] = useState(0);
  const [chartTipEmi, setChartTipEmi] = useState(0);
  
  const [cityId, setCityId] = useState('lahore');
  const [userEmail, setUserEmail] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingPdfExport, setPendingPdfExport] = useState(false);
  
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [pdfModal, setPdfModal] = useState({ open: false, url: null, blob: null });

  useEffect(() => {
    const savedUser = localStorage.getItem('spendwise_user_full');
    if (savedUser) {
      try { setAppUser(JSON.parse(savedUser)); } catch (e) {}
    }
    const savedData = localStorage.getItem('spendwise_data');
    if (savedData) {
      try {
        const d = JSON.parse(savedData);
        if (d.incomeRaw) setIncomeRaw(d.incomeRaw);
        if (d.expensesRaw) setExpensesRaw(d.expensesRaw);
        if (d.savingsRaw) setSavingsRaw(d.savingsRaw);
        if (d.priceRaw) setPriceRaw(d.priceRaw);
      } catch (e) {}
    }
    const saved = localStorage.getItem('spendwise_user_email');
    if (saved) setUserEmail(saved);
  }, []);

  useEffect(() => {
    if (appUser) {
      localStorage.setItem('spendwise_data', JSON.stringify({
        incomeRaw, expensesRaw, savingsRaw, priceRaw
      }));
    }
  }, [incomeRaw, expensesRaw, savingsRaw, priceRaw, appUser]);

  const handleLogin = (u) => {
    setAppUser(u);
    localStorage.setItem('spendwise_user_full', JSON.stringify(u));
    if (!u.isGuest && u.email) {
      localStorage.setItem('spendwise_user_email', u.email);
      setUserEmail(u.email);
    }
  };

  const income = Math.max(0, Number(incomeRaw) || 0);
  const expenses = Math.max(0, Number(expensesRaw) || 0);
  const savings = Math.max(0, Number(savingsRaw) || 0);
  const assetPrice = Math.max(0, Number(priceRaw) || 0);

  const cityData = CITIES.find(c => c.id === cityId) || CITIES[0];

  const annualLoanRate = useMemo(() => {
    if (interestRateRaw === '' || interestRateRaw === '.') return ANNUAL_LOAN_RATE;
    const n = parseFloat(interestRateRaw);
    if (!Number.isFinite(n) || n < 0) return ANNUAL_LOAN_RATE;
    return Math.min(Math.max(n / 100, 0), 0.6);
  }, [interestRateRaw]);

  const annualLoanRatePct = annualLoanRate * 100;

  const rateDisclaimerText = useMemo(() => {
    const p = annualLoanRatePct;
    if (!Number.isFinite(p)) return '12';
    return Math.abs(p - Math.round(p)) < 0.05 ? String(Math.round(p)) : p.toFixed(1);
  }, [annualLoanRatePct]);

  const monthlySurplus = income - expenses;
  const emergencyLow = expenses * 3;
  const emergencyHigh = expenses * 6;

  const needsDown = requiresDownPaymentStructure(assetType, assetPrice);
  const installmentMode = emiTermMonths !== EMI_NONE;
  const downPaymentAmount =
    installmentMode && needsDown ? Math.round(assetPrice * downPaymentRate) : 0;
  const loanPrincipal = installmentMode ? Math.max(0, assetPrice - downPaymentAmount) : 0;

  const financingEnabled = installmentMode && loanPrincipal > 0;
  const structureDown = needsDown && installmentMode;
  const showDownPaymentUi = structureDown;

  const emiPlans = useMemo(() => {
    if (!financingEnabled) return [];
    return buildEmiPlans(loanPrincipal, income, annualLoanRate, {
      cashDownPayment: downPaymentAmount,
    });
  }, [financingEnabled, loanPrincipal, income, downPaymentAmount, annualLoanRate]);

  const bestPlan = useMemo(
    () => pickBestEmiPlan(emiPlans, monthlySurplus, income),
    [emiPlans, monthlySurplus, income]
  );

  const downPaymentRateLabel =
    DOWN_PAYMENT_RATE_OPTIONS.find((o) => o.value === downPaymentRate)?.label ?? '';

  const userInstallmentLabel = useMemo(
    () =>
      !installmentMode
        ? 'No installment financing (cash purchase)'
        : `${emiTermMonths} months (your selection — chart focus)`,
    [installmentMode, emiTermMonths]
  );

  const riskScore = useMemo(
    () =>
      computeRiskScore({
        income,
        expenses,
        savings,
        assetPrice,
        monthlySurplus,
        emergencyTargetHigh: emergencyHigh,
        bestEmiPct: bestPlan ? bestPlan.pctIncome : 0,
        downPaymentAmount,
      }),
    [income, expenses, savings, assetPrice, monthlySurplus, emergencyHigh, bestPlan, downPaymentAmount]
  );

  const decision = useMemo(
    () =>
      decideAction({
        riskScore,
        monthlySurplus,
        savings,
        assetPrice,
        emergencyTargetHigh: emergencyHigh,
        bestPlan,
        income,
        expenses,
        financingEnabled,
        downPaymentAmount,
        needsDownPayment: structureDown,
      }),
    [
      riskScore,
      monthlySurplus,
      savings,
      assetPrice,
      emergencyHigh,
      bestPlan,
      income,
      expenses,
      financingEnabled,
      downPaymentAmount,
      structureDown,
    ]
  );

  const stressIncome = useMemo(() => scenarioStress(income, expenses, 0.8, 1), [income, expenses]);

  const stressExpense = useMemo(() => scenarioStress(income, expenses, 1, 1.1), [income, expenses]);

  const assetTypeLabel = useMemo(() => {
    if (assetType === 'other') {
      const t = otherAssetLabel.trim();
      return t || 'Other';
    }
    return ASSET_TYPES.find((a) => a.id === assetType)?.label ?? 'Other';
  }, [assetType, otherAssetLabel]);

  const analysis = useMemo(
    () =>
      buildAnalysisReport({
        decision,
        bestPlan,
        riskScore,
        monthlySurplus,
        income,
        expenses,
        savings,
        assetPrice,
        assetTypeLabel,
        emergencyLow,
        emergencyHigh,
        emiPlans,
        stressIncome,
        stressExpense,
        financingEnabled,
        downPaymentAmount,
        loanPrincipal,
        needsDownPayment: structureDown,
        downPaymentRateLabel,
        userInstallmentLabel,
        annualLoanRatePct,
      }),
    [
      decision,
      bestPlan,
      riskScore,
      monthlySurplus,
      income,
      expenses,
      savings,
      assetPrice,
      assetTypeLabel,
      emergencyLow,
      emergencyHigh,
      emiPlans,
      stressIncome,
      stressExpense,
      financingEnabled,
      downPaymentAmount,
      loanPrincipal,
      structureDown,
      downPaymentRateLabel,
      userInstallmentLabel,
      annualLoanRatePct,
    ]
  );

  const overviewBars = useMemo(() => {
    const rows = [
      { name: 'Income', amount: income },
      { name: 'Expenses', amount: expenses },
      { name: 'Savings', amount: savings },
      { name: 'Surplus', amount: Math.max(monthlySurplus, 0) },
      { name: 'Purchase Price', amount: assetPrice },
    ];
    if (downPaymentAmount > 0) {
      rows.splice(4, 0, { name: 'Down Payment', amount: downPaymentAmount });
    }
    return rows;
  }, [income, expenses, savings, monthlySurplus, assetPrice, downPaymentAmount]);

  const emiCompareBars = useMemo(
    () =>
      emiPlans.map((p) => ({
        name: `${p.months} mo`,
        monthly: Math.round(p.monthlyEmi),
        interest: Math.round(p.totalInterest),
        total: Math.round(p.totalCost),
      })),
    [emiPlans]
  );

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  useEffect(() => {
    if (appMode !== 'personal') return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActiveSection(en.target.id);
        });
      },
      { threshold: 0.35 }
    );
    SECTION_IDS.forEach((id) => {
      const node = document.getElementById(id);
      if (node) obs.observe(node);
    });
    return () => obs.disconnect();
  }, [appMode]);

  const verdictDisplayClass =
    analysis.publicVerdictKey === 'buy'
      ? 'buy'
      : analysis.publicVerdictKey === 'wait'
        ? 'wait'
        : 'cautious';

  const preparePdfPreview = () => {
    if (!userEmail) {
      setPendingPdfExport(true);
      setEmailModalOpen(true);
      return;
    }
    openPdfModal();
  };

  const openPdfModal = () => {
    const blob = createPdfBlob(
      analysis,
      { income, expenses, savings, assetPrice, assetTypeLabel },
      emiPlans,
      decision.key,
      { financingEnabled, downPaymentAmount, loanPrincipal, needsDownPayment: structureDown, downPaymentRateLabel, bestPlan, monthlySurplus, annualLoanRatePct }
    );
    const url = URL.createObjectURL(blob);
    setPdfModal({ open: true, url, blob });
  };

  const closePdfModal = () => {
    setPdfModal((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return { open: false, url: null, blob: null };
    });
  };

  const downloadPdfFromModal = () => {
    if (!pdfModal.blob) return;
    const href = URL.createObjectURL(pdfModal.blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `spend-wise-${Date.now()}.pdf`;
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 2500);
  };

  const handleEmailSuccess = (email) => {
    setUserEmail(email);
    setEmailModalOpen(false);
    if (pendingPdfExport) {
      setPendingPdfExport(false);
      openPdfModal();
    }
  };

  const handleSaveAnalysis = () => {
    if (!userEmail) {
      setPendingPdfExport(false);
      setEmailModalOpen(true);
    } else {
      alert('Analysis saved securely to the cloud!');
    }
  };

  if (!appUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">
      <EmailGateModal 
        isOpen={emailModalOpen} 
        onClose={() => {
          setEmailModalOpen(false);
          setPendingPdfExport(false);
        }} 
        onSuccess={handleEmailSuccess} 
      />

      <ShareCardModal 
        isOpen={shareCardOpen}
        onClose={() => setShareCardOpen(false)}
        verdict={analysis.publicVerdict}
        verdictClass={verdictDisplayClass}
        riskScore={riskScore}
        price={assetPrice}
        assetName={assetTypeLabel}
      />

      <div className="shell">
        <motion.header className="hero" initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {appUser.name && appUser.name !== 'Guest' && (
            <div style={{ color: '#5eead4', fontSize: 14, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
              Welcome back, {appUser.name}
            </div>
          )}
          <h1>Spend Wise</h1>
          <p>Decide whether to buy outright, structure installments, or wait.</p>
          <div style={{ marginTop: 12, padding: '4px 12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: 20, fontSize: 12, fontWeight: 500, display: 'inline-block' }}>
            Trusted by <span style={{ fontWeight: 800 }}>14,283</span> purchase decisions
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 32, background: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 12, maxWidth: 400, margin: '32px auto 0' }}>
            <button className={`btn-ghost btn-compact \${appMode === 'personal' ? 'active' : ''}`} style={appMode === 'personal' ? {background: 'rgba(255,255,255,0.1)'} : {}} onClick={() => setAppMode('personal')}>Personal</button>
            <button className={`btn-ghost btn-compact \${appMode === 'compare' ? 'active' : ''}`} style={appMode === 'compare' ? {background: 'rgba(255,255,255,0.1)'} : {}} onClick={() => setAppMode('compare')}>Compare</button>
            <button className={`btn-ghost btn-compact \${appMode === 'team' ? 'active' : ''}`} style={appMode === 'team' ? {background: 'rgba(255,255,255,0.1)', color: '#a78bfa'} : {}} onClick={() => setAppMode('team')}>Team Mode</button>
          </div>
        </motion.header>

        {appMode === 'compare' && <CompareModeDemo income={income} expenses={expenses} savings={savings} />}
        {appMode === 'team' && <TeamModeDemo />}

        {appMode === 'personal' && (
          <>
            <nav className="progress-rail" aria-label="Section navigation">
              {[
                ['inputs', '01 · Inputs'],
                ['engine', '02 · Engine'],
                ['emi', '03 · EMI'],
                ['analysis', '04 · Plan'],
                ['charts', '05 · Charts'],
              ].map(([id, label]) => (
                <button key={id} type="button" className={activeSection === id ? 'active' : ''} onClick={() => scrollTo(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <motion.section id="inputs" className="section" variants={fadeSlide} initial="show" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
              <div className="glass-card">
                <div className="section-title">
                  <h2>Financial inputs</h2>
                  <span>Step 1</span>
                </div>
                
                <div className="field" style={{ marginBottom: 24, maxWidth: 300 }}>
                  <label htmlFor="city">Your City (For Benchmarking)</label>
                  <select id="city" value={cityId} onChange={e => setCityId(e.target.value)}>
                    {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid-inputs">
                  <div className="field">
                    <label htmlFor="income">Monthly income (PKR)</label>
                    <input
                      id="income"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={incomeRaw}
                      onChange={(e) => setIncomeRaw(digitsOnly(e.target.value))}
                    />
                    <div style={{ fontSize: 11, color: income > cityData.median ? '#5eead4' : 'var(--muted)', marginTop: 6, fontWeight: 500 }}>
                      {income > cityData.median ? 'Above' : 'Below'} {cityData.name} median ({formatCurrency(cityData.median)})
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="expenses">Monthly expenses (PKR)</label>
                    <input
                      id="expenses"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={expensesRaw}
                      onChange={(e) => setExpensesRaw(digitsOnly(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="savings">Liquid savings (PKR)</label>
                    <input
                      id="savings"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={savingsRaw}
                      onChange={(e) => setSavingsRaw(digitsOnly(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="price">Purchase price (PKR)</label>
                    <input
                      id="price"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={priceRaw}
                      onChange={(e) => setPriceRaw(digitsOnly(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="asset">Asset type</label>
                    <select
                      id="asset"
                      value={assetType}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssetType(v);
                        if (v !== 'other') setOtherAssetLabel('');
                      }}
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {assetType === 'other' ? (
                    <div className="field field-span">
                      <label htmlFor="other-asset">Name of asset</label>
                      <input
                        id="other-asset"
                        type="text"
                        placeholder="Describe what you are buying"
                        value={otherAssetLabel}
                        onChange={(e) => setOtherAssetLabel(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  ) : null}
                  <div className="field">
                    <label htmlFor="interest-rate">Annual interest rate (%)</label>
                    <input
                      id="interest-rate"
                      inputMode="decimal"
                      autoComplete="off"
                      value={interestRateRaw}
                      onChange={(e) => setInterestRateRaw(decimalRateOnly(e.target.value))}
                      placeholder="e.g. 12 (optional)"
                    />
                    <p className="field-hint">
                      Enter your assumed annual rate for installments. Leave blank to use 12%. All EMI math and disclaimers use
                      this rate ({rateDisclaimerText}% right now).
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="emi-term">Installment tenure</label>
                    <select
                      id="emi-term"
                      className="select-full"
                      value={emiTermMonths}
                      onChange={(e) => setEmiTermMonths(Number(e.target.value))}
                    >
                      <option value={EMI_NONE}>No EMI (cash purchase)</option>
                      {EMI_MONTHS_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m} months
                        </option>
                      ))}
                    </select>
                  </div>
                  {showDownPaymentUi && (
                    <div className="field field-span">
                      <label htmlFor="down-pct">Down payment (bank-style)</label>
                      <select
                        id="down-pct"
                        className="select-full"
                        value={downPaymentRate}
                        onChange={(e) => setDownPaymentRate(Number(e.target.value))}
                      >
                        {DOWN_PAYMENT_RATE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label} upfront — balance financed
                          </option>
                        ))}
                      </select>
                      <p className="field-hint">
                        For vehicles, homes, or any purchase from {formatCurrency(BIG_PURCHASE_THRESHOLD_PKR)} upward, we apply a
                        mandatory down payment ({DOWN_PAYMENT_RATE_OPTIONS.map((o) => o.label).join(', ')}). Monthly installments
                        cover only the remaining principal.
                      </p>
                    </div>
                  )}
                </div>
                <div className="actions">
                  <button type="button" className="btn-primary" onClick={() => scrollTo('engine')}>
                    Run analysis
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => scrollTo('charts')}>
                    Jump to charts
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section id="engine" className="section" variants={fadeSlide} initial="show" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
              <div className="glass-card">
                <div className="section-title">
                  <h2>Financial engine</h2>
                  <span>Step 2</span>
                </div>
                <div className="metrics-grid">
                  <div className="metric">
                    <div className="label">Risk score</div>
                    <div className="value">{riskScore} / 100</div>
                  </div>
                  <div className="metric">
                    <div className="label">Emergency fund target</div>
                    <div className="value">
                      {formatCurrency(emergencyLow)} – {formatCurrency(emergencyHigh)}
                    </div>
                  </div>
                  <div className="metric">
                    <div className="label">Monthly surplus</div>
                    <div className="value">{formatCurrency(monthlySurplus)}</div>
                  </div>
                  {showDownPaymentUi && (
                    <div className="metric">
                      <div className="label">Down / financed</div>
                      <div className="value">
                        {formatCurrency(downPaymentAmount)} · {formatCurrency(loanPrincipal)}
                      </div>
                    </div>
                  )}
                  <div className="metric">
                    <div className="label">Best installment (auto)</div>
                    <div className="value">
                      {!financingEnabled ? 'Cash only' : bestPlan ? `${bestPlan.months} mo · ${formatCurrency(bestPlan.monthlyEmi)}` : '—'}
                    </div>
                  </div>
                </div>
                <div className="risk-wrap">
                  <div className="risk-header">
                    <span>Risk intensity</span>
                    <span>
                      {riskScore >= 72 ? 'Severe' : riskScore >= 48 ? 'Elevated' : riskScore >= 28 ? 'Moderate' : 'Contained'}
                    </span>
                  </div>
                  <div className="risk-track">
                    <div className="risk-fill" style={{ width: `${riskScore}%` }} />
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section id="emi" className="section" variants={fadeSlide} initial="show" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
              <div className="glass-card">
                <div className="section-title">
                  <h2>Installment comparison</h2>
                  <span>Step 3</span>
                </div>
                <p style={{ marginTop: 0, color: 'var(--muted)', lineHeight: 1.6, fontSize: 14 }}>
                  Annual lending rate modeled at <strong>{rateDisclaimerText}%</strong> on the financed balance (PKR), matching
                  the rate you entered in Step 1 (or 12% if left blank). Best plan minimizes interest while respecting
                  affordability guardrails. Total cost includes any required down payment.
                </p>
                {!financingEnabled ? (
                  <p className="empty-panel">No EMI selected — comparison table is hidden. Choose an installment tenure above to compare options.</p>
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Months</th>
                            <th>Monthly expense</th>
                            <th>Interest</th>
                            <th>Total outlay</th>
                            <th>% income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emiPlans.map((p) => (
                            <tr key={p.months} className={bestPlan && p.months === bestPlan.months ? 'best-row' : ''}>
                              <td>{p.months}</td>
                              <td>{formatCurrency(p.monthlyEmi)}</td>
                              <td>{formatCurrency(p.totalInterest)}</td>
                              <td>{formatCurrency(p.totalCost)}</td>
                              <td>{p.pctIncome.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Embedded Emi Calendar view for selected tenure */}
                    <EmiCalendar 
                      emiTermMonths={emiTermMonths} 
                      monthlyEmi={emiPlans.find(e => e.months === emiTermMonths)?.monthlyEmi} 
                    />
                  </>
                )}
              </div>
            </motion.section>

            <motion.section id="analysis" className="section" variants={fadeSlide} initial="show" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
              <div className="glass-card">
                <div className="section-title">
                  <h2>Strategic Action Plan:</h2>
                  <span>Step 4</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  <span className={`decision-pill \${verdictDisplayClass}`}>Final Decision: {analysis.publicVerdict}</span>
                  <span className="decision-pill emi" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>
                    Recommended: {analysis.bestEmiLabel}
                  </span>
                  <span className="decision-pill pill-muted" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>
                    Your tenure: {analysis.userInstallmentSelection}
                  </span>
                </div>
                <div className="analysis-block">
                  <h3>Financial health</h3>
                  <p>{analysis.financialHealthSummary}</p>
                </div>
                <div className="analysis-block">
                  <h3>Risk factors</h3>
                  <ul>
                    {analysis.riskFactors.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="analysis-block">
                  <h3>Cash flow impact</h3>
                  <p>{analysis.cashFlowImpact}</p>
                </div>
                <div className="analysis-block">
                  <h3>Long-term impact</h3>
                  <p>{analysis.longTermImpact}</p>
                </div>
                <div className="analysis-block">
                  <h3>Smart financial advice</h3>
                  <ul>
                    {analysis.smartAdvice.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div className="analysis-block">
                  <h3>Scenario lab</h3>
                  <p>{analysis.stressIncomeDrop}</p>
                  <p style={{ marginTop: 10 }}>{analysis.stressExpenseRise}</p>
                </div>
                <div className="actions" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn-primary" onClick={preparePdfPreview}>
                    {userEmail ? 'View as PDF' : 'Unlock PDF Report'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setShareCardOpen(true)}>
                    Share my analysis
                  </button>
                  <button type="button" className="btn-ghost" onClick={handleSaveAnalysis} style={{color: userEmail ? '#5eead4' : ''}}>
                    {userEmail ? '✓ Auto-Saved' : 'Save this analysis'}
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section id="charts" className="section" variants={fadeSlide} initial="show" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
              <div className="glass-card">
                <div className="section-title">
                  <h2>Visualization suite</h2>
                  <span>Step 5</span>
                </div>
                <div className="chart-card">
                  <div className="chart-title">Financial overview (PKR)</div>
                  <div className="chart-surface" onMouseLeave={() => setChartTipOverview((n) => n + 1)}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overviewBars}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5eead4" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                          key={chartTipOverview}
                          isAnimationActive
                          animationDuration={200}
                          animationEasing="ease-out"
                          cursor={{ fill: 'rgba(94,234,212,0.06)' }}
                          contentStyle={TOOLTIP_PANEL}
                          formatter={(v) => formatCurrency(v)}
                        />
                        <Bar dataKey="amount" fill="url(#barGrad)" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="chart-card">
                  <div className="chart-title">Installment comparison · PKR</div>
                  {!financingEnabled ? (
                    <p className="empty-panel compact">No installment scenarios to chart while cash purchase is selected.</p>
                  ) : (
                    <div className="chart-surface" onMouseLeave={() => setChartTipEmi((n) => n + 1)}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={emiCompareBars}>
                          <CartesianGrid strokeDasharray="4 8" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <Tooltip
                            key={chartTipEmi}
                            isAnimationActive
                            animationDuration={200}
                            animationEasing="ease-out"
                            cursor={{ fill: 'rgba(167,139,250,0.06)' }}
                            contentStyle={TOOLTIP_PANEL}
                            formatter={(v) => formatCurrency(v)}
                          />
                          <Legend />
                          <Bar dataKey="monthly" name="Monthly expense" fill="#a78bfa" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="interest" name="Total interest" fill="#fb7185" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="total" name="Total outlay" fill="#5eead4" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          </>
        )}

        {appMode === 'personal' && <p className="footer-note">Spend Wise models are illustrative and not individualized investment advice.</p>}

        {pdfModal.open && pdfModal.url ? (
          <div className="pdf-modal-backdrop" role="dialog" aria-modal="true" aria-label="PDF preview">
            <div className="pdf-modal">
              <div className="pdf-modal-toolbar">
                <span className="pdf-modal-title">Spend Wise — preview</span>
                <div className="pdf-modal-actions">
                  <button type="button" className="btn-ghost btn-compact" onClick={downloadPdfFromModal}>
                    Download PDF
                  </button>
                  <button type="button" className="btn-primary btn-compact" onClick={closePdfModal}>
                    Close
                  </button>
                </div>
              </div>
              <iframe className="pdf-modal-frame" title="PDF preview" src={`${pdfModal.url}#toolbar=1`} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
