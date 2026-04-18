export const EMI_MONTHS_OPTIONS = [6, 12, 18, 24, 30, 36];
export const EMI_NONE = 0;
export const ANNUAL_LOAN_RATE = 0.12;
export const BIG_PURCHASE_THRESHOLD_PKR = 2_000_000;

export const DOWN_PAYMENT_RATE_OPTIONS = [
  { value: 0.3, label: '30%' },
  { value: 0.35, label: '35%' },
  { value: 0.4, label: '40%' },
];
  
export const ASSET_TYPES = [
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'home', label: 'Home / Property' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'jewelry', label: 'Jewelry / Luxury' },
  { id: 'other', label: 'Other' },
];

const BIG_PURCHASE_TYPE_IDS = new Set(['vehicle', 'home']);

export function requiresDownPaymentStructure(assetTypeId, assetPrice) {
  return (
    assetPrice >= BIG_PURCHASE_THRESHOLD_PKR || BIG_PURCHASE_TYPE_IDS.has(assetTypeId)
  );
}

export function calculateEMI(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r <= 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function buildEmiPlans(loanPrincipal, income, annualRate, options = {}) {
  const cashDown = Math.max(0, options.cashDownPayment ?? 0);
  if (loanPrincipal <= 0) return [];
  return EMI_MONTHS_OPTIONS.map((months) => {
    const monthly = calculateEMI(loanPrincipal, annualRate, months);
    const loanPayoffTotal = monthly * months;
    const interest = Math.max(0, loanPayoffTotal - loanPrincipal);
    const pctIncome = income > 0 ? (monthly / income) * 100 : 100;
    return {
      months,
      monthlyEmi: monthly,
      totalInterest: interest,
      totalCost: loanPayoffTotal + cashDown,
      pctIncome,
      loanPrincipal,
    };
  });
}

export function pickBestEmiPlan(plans, monthlySurplus, income) {
  if (!plans.length) return null;
  const maxAffordable = Math.max(monthlySurplus * 0.95, income * 0.35);
  const affordable = plans.filter((p) => p.monthlyEmi <= maxAffordable && p.monthlyEmi <= income * 0.45);
  const pool = affordable.length ? affordable : plans;
  const benefitScore = (p) => {
    const incomeBurden = (p.pctIncome / 100) * income * 3;
    const surplusStrain = p.monthlyEmi > Math.max(monthlySurplus * 0.88, 1) ? income * 0.4 : 0;
    return p.totalInterest + incomeBurden + surplusStrain;
  };
  return pool.reduce((best, cur) => (benefitScore(cur) < benefitScore(best) ? cur : best));
}

export function computeRiskScore({
  income,
  expenses,
  savings,
  assetPrice,
  monthlySurplus,
  emergencyTargetHigh,
  bestEmiPct,
  downPaymentAmount,
}) {
  let score = 0;
  const inc = Math.max(income, 1);
  const priceMonths = assetPrice / inc;

  if (priceMonths >= 1.5) {
    score += Math.min(42, (priceMonths - 1.5) * 3.2);
  }
  if (priceMonths >= 12) score += 12;
  if (priceMonths >= 36) score += 15;
  if (priceMonths >= 72) score += 12;

  if (monthlySurplus < 0) score += 32;
  else if (monthlySurplus < expenses * 0.12) score += 20;
  else if (monthlySurplus < inc * 0.08) score += 10;

  if (assetPrice > 0) {
    const cov = savings / assetPrice;
    if (cov < 0.25) score += Math.min(22, (0.25 - cov) * 55);
    if (cov < 0.05) score += 14;
  }

  if (emergencyTargetHigh > 0 && savings < emergencyTargetHigh) {
    const gap = emergencyTargetHigh - savings;
    score += Math.min(20, (gap / emergencyTargetHigh) * 20);
  } else if (expenses > 0 && savings < expenses * 2) {
    score += 8;
  }

  if (savings < assetPrice) {
    const shortfall = (assetPrice - savings) / Math.max(assetPrice, 1);
    score += Math.min(18, shortfall * 18);
  }

  if (downPaymentAmount > 0 && savings < downPaymentAmount) score += 16;

  if (bestEmiPct > 42) score += 16;
  else if (bestEmiPct > 32) score += 11;
  else if (bestEmiPct > 22) score += 6;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function mapPublicVerdict(decisionKey, riskScore) {
  if (decisionKey === 'BUY') {
    return { label: 'Buy', key: 'buy' };
  }
  if (decisionKey === 'AVOID') {
    return { label: 'Be cautious', key: 'cautious' };
  }
  if (decisionKey === 'EMI BEST') {
    if (riskScore >= 58) {
      return { label: 'Be cautious', key: 'cautious' };
    }
    return { label: 'Buy', key: 'buy' };
  }
  if (riskScore >= 52) {
    return { label: 'Be cautious', key: 'cautious' };
  }
  return { label: 'Wait', key: 'wait' };
}

export function decideAction({
  riskScore,
  monthlySurplus,
  savings,
  assetPrice,
  emergencyTargetHigh,
  bestPlan,
  income,
  expenses,
  financingEnabled,
  downPaymentAmount,
  needsDownPayment,
}) {
  const canLumpSumFull = savings >= assetPrice;
  const reserveAfterFull = savings - assetPrice;
  const emergencyOkAfterFull = reserveAfterFull >= emergencyTargetHigh;
  const cashUpFront = needsDownPayment ? downPaymentAmount : 0;
  const canCoverUpFront = savings >= cashUpFront;
  const reserveAfterDown = savings - cashUpFront;
  const emergencyOkAfterDown = reserveAfterDown >= emergencyTargetHigh;

  if (!financingEnabled || !bestPlan) {
    if (riskScore >= 68 || monthlySurplus < 0) {
      return { key: 'AVOID', label: 'AVOID' };
    }
    if (canLumpSumFull && emergencyOkAfterFull) {
      return { key: 'BUY', label: 'BUY' };
    }
    if (canLumpSumFull && !emergencyOkAfterFull) {
      return { key: 'WAIT', label: 'WAIT' };
    }
    return { key: 'WAIT', label: 'WAIT' };
  }

  const maxEmiAllowed = Math.max(0, Math.min(monthlySurplus * 0.92, income * 0.38));
  const affordableEmi = bestPlan.monthlyEmi <= maxEmiAllowed;

  if (riskScore >= 72 || monthlySurplus < 0) {
    return { key: 'AVOID', label: 'AVOID' };
  }

  if (needsDownPayment && !canCoverUpFront) {
    return { key: 'WAIT', label: 'WAIT' };
  }

  if (!affordableEmi && !canLumpSumFull) {
    return { key: 'WAIT', label: 'WAIT' };
  }

  if (canLumpSumFull && emergencyOkAfterFull && monthlySurplus > 0) {
    return { key: 'BUY', label: 'BUY' };
  }

  if (canLumpSumFull && !emergencyOkAfterFull && affordableEmi && canCoverUpFront) {
    return { key: 'EMI BEST', label: 'EMI BEST' };
  }

  if (!canLumpSumFull && affordableEmi && canCoverUpFront) {
    const reserveFloor = Math.min(emergencyTargetHigh * 0.42, expenses * 2.5);
    if (reserveAfterDown < reserveFloor && monthlySurplus < income * 0.06) {
      return { key: 'WAIT', label: 'WAIT' };
    }
    return { key: 'EMI BEST', label: 'EMI BEST' };
  }

  if (canLumpSumFull) {
    return { key: 'BUY', label: 'BUY' };
  }

  return { key: 'WAIT', label: 'WAIT' };
}

export function scenarioStress(income, expenses, factorIncome, factorExpense) {
  const newIncome = income * factorIncome;
  const newExpenses = expenses * factorExpense;
  return {
    income: newIncome,
    expenses: newExpenses,
    surplus: newIncome - newExpenses,
  };
}

export function buildAnalysisReport(ctx) {
  const {
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
    needsDownPayment,
    downPaymentRateLabel,
    userInstallmentLabel,
    annualLoanRatePct = 12,
  } = ctx;

  const verdict = mapPublicVerdict(decision.key, riskScore);

  const health =
    riskScore < 32
      ? 'Strong liquidity and manageable obligations relative to income.'
      : riskScore < 52
        ? 'Balanced, with room to improve reserves before large commitments.'
        : riskScore < 72
          ? 'Elevated pressure on cash flow; prioritize buffers and debt service headroom.'
          : 'Fragile cushion; large purchases amplify downside risk.';

  const riskFactors = [];
  if (monthlySurplus <= 0) riskFactors.push('Monthly cash flow is negative or flat.');
  if (savings < emergencyHigh) riskFactors.push('Emergency fund sits below a 6-month expense target.');
  if (needsDownPayment && downPaymentAmount > 0 && savings < downPaymentAmount) {
    riskFactors.push('Savings do not yet cover the required down payment.');
  }
  if (financingEnabled && bestPlan && bestPlan.pctIncome > 30) {
    riskFactors.push('EMI would absorb a material share of income.');
  }
  if (assetPrice > income * 6) riskFactors.push('Purchase price is high relative to annual income.');
  if (riskFactors.length === 0) riskFactors.push('No critical structural risks flagged from inputs.');

  let cashFlow = '';
  if (!financingEnabled) {
    cashFlow =
      'No installment financing selected; assessment assumes an outright purchase from savings and ongoing surplus.';
  } else if (decision.key === 'EMI BEST' && bestPlan) {
    const downNote =
      needsDownPayment && downPaymentAmount > 0
        ? ` After ${formatCurrency(downPaymentAmount)} down (${downPaymentRateLabel}), `
        : ' ';
    cashFlow = `${downNote.trim()}EMI of ${formatCurrency(bestPlan.monthlyEmi)} for ${bestPlan.months} months covers a financed balance of ${formatCurrency(loanPrincipal)}, with ${formatCurrency(bestPlan.totalInterest)} in interest on the loan portion (modeled at ${Number(annualLoanRatePct).toFixed(1)}% annual on the financed balance).`;
  } else if (decision.key === 'BUY') {
    cashFlow =
      'Outright purchase preserves borrowing costs if post-purchase reserves remain intact.';
  } else if (decision.key === 'AVOID') {
    cashFlow = 'Current flow cannot safely absorb this purchase without stress.';
  } else {
    cashFlow = 'Delaying improves optionality until surplus and reserves strengthen.';
  }

  let longTerm = '';
  if (!financingEnabled) {
    longTerm =
      'Paying cash avoids interest and keeps future income free of this installment obligation.';
  } else if (bestPlan && decision.key !== 'BUY') {
    longTerm = `Financing shifts ${formatCurrency(bestPlan.totalInterest)} in interest to the lender over ${bestPlan.months} months on the financed portion at ${Number(annualLoanRatePct).toFixed(1)}% annual—reasonable if your after-tax return on savings is below that rate.`;
  } else {
    longTerm =
      'Buying outright avoids interest drag and keeps future income unencumbered by this liability.';
  }

  const advice = [];
  if (needsDownPayment && downPaymentAmount > 0) {
    advice.push(
      `For this property or vehicle-style purchase, plan for ${downPaymentRateLabel} down (${formatCurrency(downPaymentAmount)}) before installments begin.`
    );
  }
  if (decision.key === 'WAIT' || decision.key === 'AVOID') {
    advice.push('Increase monthly surplus or trim discretionary spend before recommitting.');
    advice.push('Target emergency fund to at least six months of essential expenses.');
  }
  if (decision.key === 'EMI BEST' && bestPlan) {
    advice.push(`Prefer the ${bestPlan.months}-month schedule to minimize interest while keeping payments disciplined.`);
    advice.push('Automate installment dates aligned with salary credit to avoid liquidity gaps.');
  }
  if (decision.key === 'BUY') {
    advice.push('After purchase, rebuild the emergency buffer within 6–9 months.');
    advice.push('Keep installment capacity unused for opportunistic needs or income volatility.');
  }
  if (!financingEnabled) {
    advice.push('If you later consider financing, re-run the model with an installment tenure selected.');
  }
  advice.push('Re-run this model if income, rent, or dependents change materially.');

  const bestEmiLabel = !financingEnabled
    ? 'No installment financing in this scenario'
    : bestPlan
      ? `${bestPlan.months} mo @ ${formatCurrency(bestPlan.monthlyEmi)}/mo (model recommendation)`
      : 'N/A';

  return {
    finalDecision: decision.label,
    publicVerdict: verdict.label,
    publicVerdictKey: verdict.key,
    riskScore,
    bestEmiLabel,
    userInstallmentSelection: userInstallmentLabel,
    financialHealthSummary: health,
    riskFactors,
    cashFlowImpact: cashFlow,
    longTermImpact: longTerm,
    smartAdvice: advice,
    stressIncomeDrop: `If income drops 20%, surplus moves to ${formatCurrency(stressIncome.surplus)} (${stressIncome.surplus >= 0 ? 'still serviceable' : 'requires immediate revision'}).`,
    stressExpenseRise: `If expenses rise 10%, surplus moves to ${formatCurrency(stressExpense.surplus)}—${stressExpense.surplus < monthlySurplus * 0.7 ? 'material tightening' : 'manageable with monitoring'}.`,
    emiPlans,
    inputs: { income, expenses, savings, assetPrice, assetTypeLabel, emergencyLow, emergencyHigh },
  };
}

export function formatCurrency(n) {
  const rounded = Math.round(Number(n) || 0);
  try {
    const formatted = new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(rounded);
    if (formatted && !formatted.includes('NaN')) return formatted;
  } catch {
    /* fall through */
  }
  return `PKR ${rounded.toLocaleString('en-US')}`;
}

export function formatNumber(n) {
  const rounded = Math.round(Number(n) || 0);
  try {
    return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(rounded);
  } catch {
    return String(rounded);
  }
}

export function buildPayoffSeries(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return [{ month: 0, principalPaid: 0, interestPaid: 0 }];
  const r = annualRate / 12;
  const emi = calculateEMI(principal, annualRate, months);
  const series = [];
  let balance = principal;
  let interestSum = 0;
  for (let m = 0; m <= months; m++) {
    series.push({
      month: m,
      principalPaid: Math.round(principal - balance),
      interestPaid: Math.round(interestSum),
    });
    if (m < months && balance > 0) {
      const interestPart = balance * r;
      const principalPart = emi - interestPart;
      interestSum += interestPart;
      balance = Math.max(0, balance - principalPart);
    }
  }
  return series;
}
