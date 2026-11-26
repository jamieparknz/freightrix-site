/* Run with: node tests/levy.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const L = require('../assets/js/levy-core.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('ok', name); }
const near = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, a + ' != ' + b);

// Two-point series so "exact day" picks known prices.
const S = [['2025-01-01', 220], ['2025-06-01', 242]];

t('page example: 220 to 242 c/L at 30% is a 3.0% levy', () => {
  const r = L.compute({ series: S, baseDate: '2025-01-01', calcDate: '2025-06-01', window: 'day', basis: 'inc', weight: 30 });
  near(r.levy * 100, 3.0);
});

t('Business Tasmania example: 153.91 to 247.37 at 18% is about 10.93%', () => {
  const s = [['2025-01-01', 153.91], ['2025-06-01', 247.37]];
  const r = L.compute({ series: s, baseDate: '2025-01-01', calcDate: '2025-06-01', window: 'day', basis: 'inc', weight: 18 });
  near(r.levy * 100, 10.93, 0.01);
});

t('ex GST basis gives the same % as inc GST (GST cancels out)', () => {
  const a = L.compute({ series: S, baseDate: '2025-01-01', calcDate: '2025-06-01', window: 'day', basis: 'ex', weight: 30 });
  near(a.levy * 100, 3.0);
  near(a.cur, 220, 0.01);
});

t('price below base gives a negative levy (a discount)', () => {
  const r = L.compute({ series: S, baseDate: '2025-06-01', calcDate: '2025-06-01', basePrice: 260, window: 'day', basis: 'inc', weight: 30 });
  assert.ok(r.levy < 0);
});

t('net of FTC uses the rate in force on each date', () => {
  const s = [['2025-11-20', 176.0], ['2026-11-20', 242.0]];
  const r = L.compute({ series: s, baseDate: '2025-11-20', calcDate: '2026-11-20', window: 'day', basis: 'net', weight: 30 });
  near(r.ftcBase.ftc, 19.2, 1e-9);
  near(r.ftcCur.ftc, 21.3, 1e-9);
  near(r.base, 176 / 1.1 - 19.2, 1e-9);
  near(r.cur, 242 / 1.1 - 21.3, 1e-9);
});

t('averaging window applies to base and current alike', () => {
  const s = [['2025-01-01', 100], ['2025-01-02', 200], ['2025-02-01', 300], ['2025-02-02', 400]];
  const r = L.compute({ series: s, baseDate: '2025-01-02', calcDate: '2025-02-02', days: 7, window: 'match', basis: 'inc', weight: 100 });
  near(r.baseInc, 150); near(r.curInc, 350);
});

t('$ per job and cents per km', () => {
  const r = L.compute({ series: S, baseDate: '2025-01-01', calcDate: '2025-06-01', window: 'day', basis: 'inc', weight: 30, rate: 1000, lp100: 50 });
  near(r.levyDollars, 30); near(r.total, 1030); near(r.cpk, 11); // 22 c/L x 0.5 L/km
});

t('month arithmetic clamps to month end', () => {
  assert.strictEqual(L.addMonths('2026-03-31', -1), '2026-02-28');
  assert.strictEqual(L.fmtDate('2026-11-20'), '20 Nov 2026');
});

t('real page data: history has 53 weekly points and the latest equals compute()', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'fuel.html'), 'utf8');
  const m = html.match(/const F=(\{.*?\});;?\n/);
  const F = JSON.parse(m[1]);
  const series = F.daily.National;
  const cd = series[series.length - 1][0];
  const inp = { series, calcDate: cd, baseDate: L.addMonths(cd, -12), days: 30, window: 'match', basis: 'ex', weight: 30 };
  const h = L.history(inp, 52);
  assert.strictEqual(h.length, 53);
  near(h[52][1], L.compute(inp).levy * 100, 1e-9);
});

console.log(n + ' tests passed');
