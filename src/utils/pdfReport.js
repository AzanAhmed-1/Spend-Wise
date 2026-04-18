import { jsPDF } from 'jspdf';
import { formatCurrency, formatNumber } from './financialEngine.js';

function setBodyStyle(doc) {
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(230, 232, 245);
}

function setHeadingStyle(doc, size = 14) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(248, 250, 252);
}

function newDarkPage(doc, pageW) {
  doc.addPage();
  doc.setFillColor(18, 20, 28);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');
  doc.setTextColor(240, 242, 255);
}

export function buildSpendWisePdfDocument(analysis, inputs, emiPlans, decisionKey, meta = {}) {
  const {
    financingEnabled = true,
    downPaymentAmount = 0,
    loanPrincipal = 0,
    needsDownPayment = false,
    downPaymentRateLabel = '',
  } = meta;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 52;
  const bodyLine = 15;
  let y = margin;

  doc.setFillColor(18, 20, 28);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');

  setHeadingStyle(doc, 20);
  doc.text('Spend Wise', margin, y);
  y += 26;
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(180, 190, 210);
  doc.text('Strategic action plan (illustrative — not personal advice)', margin, y);
  y += 28;

  setHeadingStyle(doc, 13);
  doc.text('Summary (matches on-screen results)', margin, y);
  y += 18;
  setBodyStyle(doc);
  const rs = typeof analysis.riskScore === 'number' ? analysis.riskScore : 0;
  const summaryRows = [
    ['Risk score', `${rs} / 100`],
    ['Final guidance', analysis.publicVerdict ?? '—'],
    ['Your selected tenure', analysis.userInstallmentSelection ?? '—'],
    ['Recommended installment (model)', analysis.bestEmiLabel ?? '—'],
    ['Engine outcome', String(decisionKey).replace(/_/g, ' ')],
  ];
  summaryRows.forEach(([k, v]) => {
    doc.text(`${k}:`, margin, y);
    doc.text(String(v).slice(0, 80), margin + 220, y);
    y += bodyLine;
  });
  y += 14;

  setHeadingStyle(doc, 13);
  doc.text('Your inputs', margin, y);
  y += 20;
  setBodyStyle(doc);
  const inputRows = [
    ['Monthly income', formatCurrency(inputs.income)],
    ['Monthly expenses', formatCurrency(inputs.expenses)],
    ['Liquid savings', formatCurrency(inputs.savings)],
    ['Asset price', formatCurrency(inputs.assetPrice)],
    ['Asset type', inputs.assetTypeLabel],
  ];
  if (needsDownPayment) {
    inputRows.push(['Required down payment', formatCurrency(downPaymentAmount)]);
    inputRows.push(['Down payment rate', downPaymentRateLabel]);
    inputRows.push(['Amount financed (loan)', formatCurrency(loanPrincipal)]);
  }
  inputRows.forEach(([k, v]) => {
    doc.text(`${k}:`, margin, y);
    doc.text(String(v), margin + 200, y);
    y += bodyLine;
  });
  y += 18;

  setHeadingStyle(doc, 13);
  doc.text(
    financingEnabled ? 'Installment comparison (12% annual on financed balance)' : 'Installment comparison',
    margin,
    y
  );
  y += 18;

  if (!financingEnabled || !emiPlans.length) {
    setBodyStyle(doc);
    doc.text('No installment financing selected — analysis assumes paying cash from savings.', margin, y);
    y += bodyLine * 2;
  } else {
    setHeadingStyle(doc, 10);
    doc.setTextColor(160, 170, 195);
    const colX = [margin, margin + 68, margin + 148, margin + 238, margin + 328];
    const headers = ['Months', 'Installment', 'Interest', 'Total paid', '% income'];
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 12;
    doc.setDrawColor(80, 90, 120);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
    setBodyStyle(doc);
    emiPlans.forEach((p) => {
      const row = [
        String(p.months),
        formatCurrency(p.monthlyEmi),
        formatCurrency(p.totalInterest),
        formatCurrency(p.totalCost),
        `${p.pctIncome.toFixed(1)}%`,
      ];
      row.forEach((cell, i) => doc.text(cell, colX[i], y));
      y += bodyLine;
      if (y > doc.internal.pageSize.getHeight() - 120) {
        newDarkPage(doc, pageW);
        y = margin;
        setBodyStyle(doc);
      }
    });
    y += 16;
  }

  setHeadingStyle(doc, 13);
  doc.text('Narrative', margin, y);
  y += 20;
  setBodyStyle(doc);
  const wrap = (text, maxW) => doc.splitTextToSize(text, maxW);
  const analysisBlocks = [
    `Financial health: ${analysis.financialHealthSummary}`,
    `Cash flow: ${analysis.cashFlowImpact}`,
    `Long-term: ${analysis.longTermImpact}`,
    `Stress — income drops 20%: ${analysis.stressIncomeDrop}`,
    `Stress — expenses rise 10%: ${analysis.stressExpenseRise}`,
  ];
  analysisBlocks.forEach((block) => {
    wrap(block, pageW - margin * 2).forEach((line) => {
      if (y > doc.internal.pageSize.getHeight() - 72) {
        newDarkPage(doc, pageW);
        y = margin;
        setBodyStyle(doc);
      }
      doc.text(line, margin, y);
      y += bodyLine;
    });
    y += 8;
  });

  setHeadingStyle(doc, 12);
  doc.text('Risk factors', margin, y);
  y += 16;
  setBodyStyle(doc);
  analysis.riskFactors.forEach((rf) => {
    wrap(`• ${rf}`, pageW - margin * 2).forEach((line) => {
      if (y > doc.internal.pageSize.getHeight() - 72) {
        newDarkPage(doc, pageW);
        y = margin;
        setBodyStyle(doc);
      }
      doc.text(line, margin, y);
      y += bodyLine;
    });
  });
  y += 10;

  setHeadingStyle(doc, 12);
  doc.text('Recommendations', margin, y);
  y += 16;
  setBodyStyle(doc);
  analysis.smartAdvice.forEach((ad) => {
    wrap(`• ${ad}`, pageW - margin * 2).forEach((line) => {
      if (y > doc.internal.pageSize.getHeight() - 72) {
        newDarkPage(doc, pageW);
        y = margin;
        setBodyStyle(doc);
      }
      doc.text(line, margin, y);
      y += bodyLine;
    });
  });

  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(140, 148, 170);
  const stamp = `Generated ${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} · Guidance: ${analysis.publicVerdict ?? ''}`;
  doc.text(stamp, margin, doc.internal.pageSize.getHeight() - 40);

  return doc;
}

export function createPdfBlob(analysis, inputs, emiPlans, decisionKey, meta) {
  const doc = buildSpendWisePdfDocument(analysis, inputs, emiPlans, decisionKey, meta);
  return doc.output('blob');
}
