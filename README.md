[05:01, 4/19/2026] Abdul Subhan EE F21 Giki: # Spend Wise

## Tagline

*Spend Wise* helps you stress-test a major purchase in PKR: compare paying cash, financing with modeled EMIs, and waiting—so you see liquidity, emergency-fund impact, and monthly burden before you commit. A single risk score and a clear buy / wait / be-cautious verdict roll up into charts and an optional PDF, turning raw numbers into a side-by-side story you can actually act on.

(99 words.)

---

## Project description

Spend Wise is a *financial decision comparison* web app. You enter monthly income, expenses, liquid savings, purchase price, asset type, and optional loan assumptions (annual rate, installment tenure, down payment when rules apply). The *financial engine* computes surplus, emergency-fund targets, EMI scenarios, and …
[05:04, 4/19/2026] Abdul Subhan EE F21 Giki: # Spend Wise

A React app that models major purchases in *PKR: enter income, expenses, savings, and price, then compare **cash, **financed EMIs* (with optional down-payment rules), and *waiting. The engine outputs a **0–100 risk score, a recommended action (buy, EMI, wait, avoid), stress scenarios, charts, and an optional **PDF* export.

*Disclaimer:* Illustrative only—not financial, tax, or legal advice.

## Tech stack

- *React* 18 · *Vite* 5 · *@vitejs/plugin-react*
- *Recharts* (charts) · *Framer Motion* (motion)
- *jsPDF* (reports)
- *JavaScript* + *CSS*

Logic: src/utils/financialEngine.js · UI: src/App.jsx

## Getting started

bash
npm install
npm run dev


Opens the Vite dev server on port *5173* (npm start runs the same).

| Command | Description |
|---------|-------------|
| npm run build | Production build to dist/ |
| npm run preview | Serve the production build locally |

## What you’ll see

1. *Inputs* — Income, expenses, savings, price, asset type, interest rate, tenure, down payment when applicable  
2. *Engine* — Risk score, emergency-fund band, surplus, best EMI hint  
3. *Installment comparison* — EMI table across tenures  
4. *Plan* — Verdict, health summary, risks, cash-flow notes, scenario stress  
5. *Charts* — Overview and EMI comparison bars
