import { jsPDF } from 'jspdf';
import { formatCurrency } from './financialEngine.js';

const COLORS = {
  text: [17, 24, 39],
  muted: [55, 65, 81],
  border: [209, 213, 219],
  bg: [255, 255, 255],
  chipText: [255, 255, 255],
  safe: [16, 185, 129],
  warn: [245, 158, 11],
  danger: [244, 63, 94],
  tableHead: [241, 245, 249],
  rowAlt: [248, 250, 252],
};

function setBodyStyle(doc) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
}

function setMutedStyle(doc) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
}

function setHeadingStyle(doc, size = 14) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...COLORS.text);
}

function newWhitePage(doc, pageW, pageH) {
  doc.addPage();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, pageW, pageH, 'F');
}

function wrapLines(doc, text, maxW) {
  return doc.splitTextToSize(String(text || ''), maxW);
}

function riskSix(riskScore) {
  const rs = Math.max(0, Math.min(100, Number(riskScore) || 0));
  return Math.max(0, Math.min(6, Math.round((rs / 100) * 6)));
}

function drawChip(doc, x, y, text, rgb) {
  const padX = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const w = doc.getTextWidth(text) + padX * 2;
  const h = 18;
  doc.setFillColor(...rgb);
  doc.roundedRect(x, y - h + 4, w, h, 8, 8, 'F');
  doc.setTextColor(...COLORS.chipText);
  doc.text(text, x + padX, y);
  doc.setTextColor(...COLORS.text);
}

/** Status chip aligned to the right edge of a card (does not cover the title). */
function drawChipRight(doc, rightEdge, baselineY, text, rgb) {
  const padX = 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const tw = doc.getTextWidth(text);
  const w = tw + padX * 2;
  const h = 18;
  const x = rightEdge - w;
  doc.setFillColor(...rgb);
  doc.roundedRect(x, baselineY - h + 4, w, h, 8, 8, 'F');
  doc.setTextColor(...COLORS.chipText);
  doc.text(text, x + padX, baselineY);
  doc.setTextColor(...COLORS.text);
}

/** Label (left, max ~42% width) and value (right), avoids overlap on narrow cards. */
function kvLineSplit(doc, x, y, cardW, pad, label, value) {
  const valueRight = x + cardW - pad;
  const splitX = x + cardW * 0.42;
  const labelMaxW = Math.max(52, splitX - x - pad - 4);
  setMutedStyle(doc);
  doc.setFontSize(8.5);
  const labelLines = doc.splitTextToSize(String(label), labelMaxW);
  const lines = labelLines.slice(0, 2);
  lines.forEach((ln, i) => doc.text(ln, x + pad, y + i * 10));
  setBodyStyle(doc);
  doc.setFontSize(9);
  doc.text(String(value), valueRight, y, { align: 'right' });
}

function drawCardShell(doc, x, y, w, h) {
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(1);
  doc.rect(x, y, w, h);
}

function noteBlock(doc, lines, x, y, maxW, maxLines = 3) {
  setMutedStyle(doc);
  doc.setFontSize(8.5);
  let yy = y;
  lines.slice(0, maxLines).forEach((line) => {
    wrapLines(doc, line, maxW).forEach((ln) => {
      doc.text(ln, x, yy);
      yy += 11;
    });
  });
  return yy;
}

export function buildSpendWisePdfDocument(analysis, inputs, emiPlans, decisionKey, meta = {}) {
  const {
    financingEnabled = true,
    downPaymentAmount = 0,
    loanPrincipal = 0,
    needsDownPayment = false,
    bestPlan = null,
    monthlySurplus = 0,
    annualLoanRatePct = 12,
  } = meta;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentW = pageW - margin * 2;
  const bottomSafe = pageH - 48;
  let y = margin;

  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.text);
  doc.text('Spend Wise', margin, y);
  y += 20;

  setHeadingStyle(doc, 13);
  doc.setFont('helvetica', 'bold');
  doc.text('DECISION ENGINE OUTPUT', margin, y);
  y += 16;
  setMutedStyle(doc);
  doc.setFontSize(10);
  const subject = inputs.assetTypeLabel ? `Analysis for ${inputs.assetTypeLabel}` : 'Analysis';
  doc.text(subject, margin, y);
  y += 20;

  const rs = typeof analysis.riskScore === 'number' ? analysis.riskScore : 0;
  const rs6 = riskSix(rs);
  const verdict = (analysis.publicVerdict || '-').toUpperCase();
  const chipRgb =
    analysis.publicVerdictKey === 'buy'
      ? COLORS.safe
      : analysis.publicVerdictKey === 'cautious'
        ? COLORS.warn
        : COLORS.danger;
  drawChip(doc, margin, y, verdict === '-' ? 'N/A' : verdict, chipRgb);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Risk score: ${rs6}/6 (${rs}/100)`, margin + 150, y);
  doc.setTextColor(...COLORS.text);
  y += 26;

  const stripH = 52;
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, y, contentW, stripH);
  setHeadingStyle(doc, 11);
  doc.text('Purchase Price', margin + 12, y + 20);
  setBodyStyle(doc);
  doc.setFontSize(11);
  doc.text(formatCurrency(inputs.assetPrice), margin + 12, y + 38);
  setMutedStyle(doc);
  doc.setFontSize(9);
  const stripNote = `Income ${formatCurrency(inputs.income)}  |  Expenses ${formatCurrency(inputs.expenses)}  |  Savings ${formatCurrency(inputs.savings)}`;
  wrapLines(doc, stripNote, contentW - 200).forEach((ln, i) => {
    doc.text(ln, margin + 200, y + 22 + i * 11);
  });
  y += stripH + 14;

  const gap = 12;
  const cardW = (contentW - gap * 2) / 3;
  const cardH = 236;
  const pad = 10;
  const cardY = y;

  const surplusThisMo = Math.max(0, (Number(inputs.income) || 0) - (Number(inputs.expenses) || 0));
  const price = Math.max(0, Number(inputs.assetPrice) || 0);
  const sav = Math.max(0, Number(inputs.savings) || 0);
  const down = Math.max(0, Number(downPaymentAmount) || 0);

  const c1x = margin;
  drawCardShell(doc, c1x, cardY, cardW, cardH);
  const headY = cardY + 16;
  setHeadingStyle(doc, 10);
  doc.text('Pay Upfront', c1x + pad, headY);
  const fromSurplus = Math.min(surplusThisMo, price);
  const remainingAfterSurplus = Math.max(0, price - fromSurplus);
  const fromSavings = Math.min(sav, remainingAfterSurplus);
  const stillShort = Math.max(0, remainingAfterSurplus - fromSavings);
  const savingsAfter = Math.max(0, sav - fromSavings);
  const monthsToAfford =
    stillShort <= 0 ? 0 : surplusThisMo > 0 ? Math.ceil(stillShort / surplusThisMo) : Infinity;
  const emergencyLow = (Number(inputs.expenses) || 0) * 3;
  const upfrontFeasible = stillShort <= 0 && savingsAfter >= emergencyLow;
  const upfrontRisk = upfrontFeasible ? COLORS.safe : (rs >= 52 ? COLORS.danger : COLORS.warn);
  drawChipRight(
    doc,
    c1x + cardW - pad,
    headY,
    upfrontFeasible ? 'SAFE' : (rs >= 52 ? 'RISKY' : 'CAUTION'),
    upfrontRisk
  );
  let cy = cardY + 34;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Price', formatCurrency(price));
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Surplus (month)', fromSurplus > 0 ? formatCurrency(fromSurplus) : '-');
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'From savings', fromSavings > 0 ? formatCurrency(fromSavings) : '-');
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Savings after', stillShort > 0 ? 'Not yet' : formatCurrency(savingsAfter));
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Time to afford', monthsToAfford === Infinity ? 'No surplus' : `${monthsToAfford} mo.`);
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Total cost', formatCurrency(price));
  cy += 14;
  kvLineSplit(doc, c1x, cy, cardW, pad, 'Risk score', `${rs6}/6`);
  cy += 10;
  const upfrontNote =
    stillShort > 0
      ? `Surplus plus savings leave a shortfall of ${formatCurrency(stillShort)}.`
      : `Covered by surplus and savings. Savings remaining: ${formatCurrency(savingsAfter)}.`;
  noteBlock(doc, [upfrontNote], c1x + pad, cy, cardW - pad * 2, 3);

  const c2x = margin + cardW + gap;
  drawCardShell(doc, c2x, cardY, cardW, cardH);
  setHeadingStyle(doc, 10);
  doc.text('Installments', c2x + pad, headY);
  const plan = financingEnabled && bestPlan ? bestPlan : null;
  const downFromSurplus = Math.min(surplusThisMo, down);
  const downFromSavings = Math.max(0, Math.min(sav, down - downFromSurplus));
  const savAfterDown = Math.max(0, sav - downFromSavings);
  const payment = plan ? plan.monthlyEmi : 0;
  const dur = plan ? plan.months : 0;
  const totalCost = plan ? plan.totalCost : price;
  const markupPct = price > 0 ? ((totalCost - price) / price) * 100 : 0;
  const surplusAfterPay = (Number(monthlySurplus) || 0) - payment;
  const safeInstallment = plan ? surplusAfterPay >= 0 && plan.pctIncome <= 35 : false;
  const optimalInstallment = safeInstallment && (!upfrontFeasible || stillShort > 0);
  if (plan) {
    const instColor = optimalInstallment ? COLORS.safe : (safeInstallment ? COLORS.safe : COLORS.warn);
    const instLabel = optimalInstallment ? 'OPTIMAL' : (safeInstallment ? 'SAFE' : 'RISKY');
    drawChipRight(doc, c2x + cardW - pad, headY, instLabel, instColor);
  } else {
    setMutedStyle(doc);
    doc.text('-', c2x + cardW - pad - 4, headY);
  }
  cy = cardY + 34;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Down', needsDownPayment ? formatCurrency(down) : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'From surplus', needsDownPayment ? formatCurrency(downFromSurplus) : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'From savings', needsDownPayment ? formatCurrency(downFromSavings) : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Savings after', needsDownPayment ? formatCurrency(savAfterDown) : formatCurrency(sav));
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Monthly payment', plan ? formatCurrency(payment) : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Duration', plan ? `${dur} mo` : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Markup', plan ? `${markupPct.toFixed(1)}% extra` : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Total cost', plan ? formatCurrency(totalCost) : '-');
  cy += 14;
  kvLineSplit(doc, c2x, cy, cardW, pad, 'Risk score', `${rs6}/6`);
  cy += 10;
  const instNote = plan
    ? `Modeled at ${Number(annualLoanRatePct).toFixed(1)}% annual. Surplus after payment: ${
        surplusAfterPay >= 0 ? formatCurrency(surplusAfterPay) : `-${formatCurrency(Math.abs(surplusAfterPay))}`
      }/mo. Burden: ${plan.pctIncome.toFixed(1)}% of income.`
    : 'No installment scenario.';
  noteBlock(doc, [instNote], c2x + pad, cy, cardW - pad * 2, 3);

  const c3x = margin + (cardW + gap) * 2;
  drawCardShell(doc, c3x, cardY, cardW, cardH);
  setHeadingStyle(doc, 10);
  doc.text('Bank financing', c3x + pad, headY);
  const bankActive = financingEnabled && loanPrincipal > 0;
  const bankMonthlyRate = 0.25;
  const bankEmiOneMonth = bankActive ? loanPrincipal * (1 + bankMonthlyRate) : 0;
  const bankSurplusAfter = bankActive ? monthlySurplus - bankEmiOneMonth : 0;
  const bankTotal = bankActive ? down + bankEmiOneMonth : 0;
  if (bankActive) {
    const bankFeasible = bankSurplusAfter > 0;
    const bankColor = bankFeasible ? COLORS.warn : COLORS.danger;
    const bankLabel = bankFeasible ? 'CAUTION' : 'AVOID';
    drawChipRight(doc, c3x + cardW - pad, headY, bankLabel, bankColor);
  } else {
    setMutedStyle(doc);
    doc.text('-', c3x + cardW - pad - 4, headY);
  }
  cy = cardY + 34;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Down', bankActive && needsDownPayment ? formatCurrency(down) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'From surplus', bankActive && needsDownPayment ? formatCurrency(downFromSurplus) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'From savings', bankActive && needsDownPayment ? formatCurrency(downFromSavings) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Financed amt', bankActive ? formatCurrency(loanPrincipal) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Monthly EMI', bankActive ? formatCurrency(bankEmiOneMonth) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Tenure', bankActive ? '1 mo' : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Rate', bankActive ? '25%/mo (demo)' : '-');
  cy += 14;
  kvLineSplit(
    doc,
    c3x,
    cy,
    cardW,
    pad,
    'Surplus after',
    bankActive ? `${bankSurplusAfter >= 0 ? '' : '-'}${formatCurrency(Math.abs(bankSurplusAfter))}/mo` : '-'
  );
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Total cost', bankActive ? formatCurrency(bankTotal) : '-');
  cy += 14;
  kvLineSplit(doc, c3x, cy, cardW, pad, 'Risk score', bankActive ? `${Math.min(6, rs6 + 2)}/6` : '-');
  cy += 10;
  noteBlock(
    doc,
    bankActive
      ? [
          'Illustrative predatory schedule: one balloon payment at 25%/month on the financed balance. Not your modeled bank rate.',
        ]
      : ['Not applicable when there is no financed balance.'],
    c3x + pad,
    cy,
    cardW - pad * 2,
    3
  );

  y = cardY + cardH + 16;

  const tableTitleH = 36;
  const rowH = 17;
  const headerRowH = 22;
  const nRows = !financingEnabled || !emiPlans.length ? 1 : emiPlans.length;
  const tableBodyH = headerRowH + nRows * rowH + 16;
  const tableTotalH = tableTitleH + tableBodyH;

  if (y + tableTotalH > bottomSafe) {
    newWhitePage(doc, pageW, pageH);
    y = margin;
  }

  const tableTop = y;
  doc.setFillColor(...COLORS.tableHead);
  doc.rect(margin, tableTop, contentW, tableTitleH, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, tableTop, contentW, tableTotalH);
  setHeadingStyle(doc, 11);
  doc.text('Installment comparison', margin + 10, tableTop + 14);
  setMutedStyle(doc);
  doc.setFontSize(8.5);
  const rateLine = `Modeled at ${Number(annualLoanRatePct).toFixed(1)}% annual on the financed balance (PKR).`;
  wrapLines(doc, rateLine, contentW - 24).forEach((ln, i) => {
    doc.text(ln, margin + 10, tableTop + 28 + i * 11);
  });

  const tableInnerY = tableTop + tableTitleH + 8;
  if (!financingEnabled || !emiPlans.length) {
    setBodyStyle(doc);
    doc.text('No installment financing selected.', margin + 10, tableInnerY + 12);
  } else {
    const tableX = margin + 8;
    const tableW = contentW - 16;
    const cols = [
      { label: 'Tenure', w: 72 },
      { label: 'Monthly expense', w: 118 },
      { label: 'Interest', w: 100 },
      { label: 'Total cost', w: 108 },
      { label: '% income', w: 72 },
    ];
    let cx = tableX;
    doc.setFillColor(230, 235, 240);
    doc.rect(tableX, tableInnerY, tableW, headerRowH - 4, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.rect(tableX, tableInnerY, tableW, headerRowH - 4);
    setHeadingStyle(doc, 9);
    cols.forEach((c) => {
      doc.text(c.label, cx + 5, tableInnerY + 13);
      cx += c.w;
    });
    let ry = tableInnerY + headerRowH;
    setBodyStyle(doc);
    doc.setFontSize(9);
    emiPlans.forEach((p, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.rowAlt);
        doc.rect(tableX, ry - 2, tableW, rowH, 'F');
      }
      doc.setDrawColor(...COLORS.border);
      doc.line(tableX, ry + rowH - 2, tableX + tableW, ry + rowH - 2);
      let x = tableX;
      const cells = [
        `${p.months} mo`,
        formatCurrency(p.monthlyEmi),
        formatCurrency(p.totalInterest),
        formatCurrency(p.totalCost),
        `${p.pctIncome.toFixed(1)}%`,
      ];
      cells.forEach((t, i) => {
        doc.text(String(t), x + 5, ry + 11);
        x += cols[i].w;
      });
      ry += rowH;
    });
  }

  y = tableTop + tableTotalH + 18;

  newWhitePage(doc, pageW, pageH);
  y = margin;

  const insightLines = wrapLines(
    doc,
    [
      `Preferred method (your selection): ${analysis.userInstallmentSelection ?? '-'}`,
      `Recommended (model): ${analysis.bestEmiLabel ?? '-'}`,
      `Why: ${analysis.financialHealthSummary ?? ''}`,
    ].join(' '),
    contentW - 24
  );
  const insightH = 28 + insightLines.length * 12 + 16;
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, y, contentW, insightH);
  setHeadingStyle(doc, 11);
  doc.text('Strategic insight', margin + 12, y + 18);
  setBodyStyle(doc);
  doc.setFontSize(10);
  let iy = y + 34;
  insightLines.forEach((ln) => {
    doc.text(ln, margin + 12, iy);
    iy += 12;
  });
  y += insightH + 14;

  const blocks = [
    `Cash flow: ${analysis.cashFlowImpact}`,
    `Long-term: ${analysis.longTermImpact}`,
    `Stress test (income -20%): ${analysis.stressIncomeDrop}`,
    `Stress test (expenses +10%): ${analysis.stressExpenseRise}`,
  ];
  const blockText = blocks.join('\n\n');
  const blockLines = wrapLines(doc, blockText, contentW - 24);
  const summaryH = Math.min(320, 32 + blockLines.length * 12 + 16);
  doc.rect(margin, y, contentW, summaryH);
  setHeadingStyle(doc, 11);
  doc.text('Plain-English summary', margin + 12, y + 18);
  setBodyStyle(doc);
  let sy = y + 34;
  blockLines.forEach((ln) => {
    if (sy > y + summaryH - 12) return;
    doc.text(ln, margin + 12, sy);
    sy += 12;
  });

  setMutedStyle(doc);
  doc.setFontSize(9);
  const stamp = `Generated ${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} - Guidance: ${analysis.publicVerdict ?? ''}`;
  doc.text(stamp, margin, pageH - 36);

  return doc;
}

export function createPdfBlob(analysis, inputs, emiPlans, decisionKey, meta) {
  const doc = buildSpendWisePdfDocument(analysis, inputs, emiPlans, decisionKey, meta);
  return doc.output('blob');
}
