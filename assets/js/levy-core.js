/* FREIGHTIX fuel levy maths.
   Pure functions only: numbers in, numbers out, no page code.
   The page, the customer notice, the tests (and later the alert emails and API)
   all call these, so every surface gives the same answer. */
(function (root) {
  'use strict';

  /* Heavy vehicle fuel tax credit (FTC) for fuel used on public roads, c/L.
     FTC = fuel excise minus the road user charge (RUC). Each row applies from its date
     until the next row. Rows marked check:true are derived from excise less RUC and
     should be confirmed against the ATO rate tables before relying on them. */
  const TAX = [
    { from: '2023-08-07', excise: 48.8, ruc: 27.2, ftc: 21.6, check: true },
    { from: '2024-02-05', excise: 49.6, ruc: 27.2, ftc: 22.4, check: true },
    { from: '2024-07-01', excise: 49.6, ruc: 28.8, ftc: 20.8, check: true },
    { from: '2024-08-05', excise: 50.6, ruc: 28.8, ftc: 21.8, check: true },
    { from: '2025-02-03', excise: 50.8, ruc: 28.8, ftc: 22.0, check: true },
    { from: '2025-07-01', excise: 50.8, ruc: 32.4, ftc: 18.4, check: true },
    { from: '2025-08-04', excise: 51.6, ruc: 32.4, ftc: 19.2, check: true },
    { from: '2026-02-02', excise: 52.6, ruc: 32.4, ftc: 20.2, check: true },
    { from: '2026-04-01', excise: 36.6, ruc: 16.4, ftc: 20.2, check: true },
    { from: '2026-08-03', excise: 53.7, ruc: 32.4, ftc: 21.3, check: false }
  ];
  const GST = 0.1;
  /* The Fair Work Commission fuel cost recovery order measures increases
     against prices on or before 6 March 2026. */
  const FWC_BASE = '2026-03-06';

  /* ---------- dates as plain YYYY-MM-DD strings, in UTC so no timezone drift ---------- */
  function toUTC(iso) { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); }
  function fromUTC(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(iso, n) { return fromUTC(toUTC(iso) + n * 864e5); }
  function addMonths(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(d, last));
    return fromUTC(t.getTime());
  }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return d + ' ' + MON[m - 1] + ' ' + y; }

  /* ---------- prices ---------- */
  function taxAt(date) {
    let row = TAX[0];
    for (const r of TAX) { if (r.from <= date) row = r; else break; }
    return row;
  }
  /* Last published price on or before the date (AIP publishes business days only). */
  function priceAt(series, date) {
    let p = null;
    for (const [d, v] of series) { if (d <= date) p = v; else break; }
    return p;
  }
  /* Mean of daily prices in the window of `days` calendar days ending on `date`. */
  function avgTo(series, date, days) {
    const start = addDays(date, -days + 1);
    let sum = 0, n = 0;
    for (const [d, v] of series) { if (d >= start && d <= date) { sum += v; n++; } }
    return n ? sum / n : priceAt(series, date);
  }
  /* Convert a published price (c/L inc GST) to the chosen basis, using the FTC
     rate that applied on that price's own date. */
  function toBasis(pInc, basis, date) {
    if (basis === 'inc') return pInc;
    const ex = pInc / (1 + GST);
    return basis === 'net' ? ex - taxAt(date).ftc : ex;
  }

  /* ---------- the levy ----------
     input: { series, calcDate, baseDate, basePrice (optional, c/L inc GST),
              days (7|14|30), window ('match'|'day'), basis ('ex'|'net'|'inc'),
              weight (percent), rate ($, optional), lp100 (L/100 km, optional) } */
  function compute(i) {
    const days = +i.days || 30;
    const curInc = i.window === 'day' ? priceAt(i.series, i.calcDate) : avgTo(i.series, i.calcDate, days);
    const manual = i.basePrice != null && i.basePrice !== '' && +i.basePrice > 0;
    const baseInc = manual ? +i.basePrice
      : (i.window === 'day' ? priceAt(i.series, i.baseDate) : avgTo(i.series, i.baseDate, days));
    if (curInc == null || baseInc == null) return null;
    const baseTaxDate = i.baseDate || i.calcDate;
    const cur = toBasis(curInc, i.basis, i.calcDate);
    const base = toBasis(baseInc, i.basis, baseTaxDate);
    const w = (+i.weight) / 100;
    const diff = cur - base;
    const pct = diff / base;
    const levy = pct * w;
    const out = {
      curInc, baseInc, cur, base, diff, pct, weight: w, levy, manual, days,
      ftcCur: taxAt(i.calcDate), ftcBase: taxAt(baseTaxDate)
    };
    if (+i.rate > 0) { out.rate = +i.rate; out.levyDollars = out.rate * levy; out.total = out.rate + out.levyDollars; }
    /* cents per km: change in fuel cost per litre times litres used per km */
    if (+i.lp100 > 0) { out.lp100 = +i.lp100; out.cpk = diff * out.lp100 / 100; }
    return out;
  }

  /* What the levy would have been at each weekly review over `weeks` weeks,
     keeping the base fixed. Newest last. */
  function history(i, weeks) {
    const out = [];
    for (let k = weeks; k >= 0; k--) {
      const d = addDays(i.calcDate, -7 * k);
      if (d < i.series[0][0]) continue;
      const r = compute(Object.assign({}, i, { calcDate: d }));
      if (r) out.push([d, r.levy * 100]);
    }
    return out;
  }

  const api = { TAX, GST, FWC_BASE, taxAt, priceAt, avgTo, toBasis, compute, history, addDays, addMonths, fmtDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Levy = api;
})(typeof window !== 'undefined' ? window : globalThis);
