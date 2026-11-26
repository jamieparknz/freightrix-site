/* FREIGHTIX fuel levy calculator: page code.
   Reads the price data the site build puts in the page (global F), keeps the
   user's answers in the address bar and on the device, and draws the result.
   All maths lives in levy-core.js (window.Levy). */
(function () {
  'use strict';
  if (typeof F === 'undefined' || !window.Levy) return;
  const L = window.Levy;
  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const STORE = 'fx_levy_v2';
  const DEF = { city: 'National', base: '12m', bp: '', w: 30, freq: 30, basis: 'ex', win: 'match', cd: '', rate: '1000', lp: '', range: 12 };
  const W_PRESETS = [20, 30, 35];
  const BASIS = { ex: 'ex GST', net: 'after fuel tax credit', inc: 'inc GST' };
  const FREQ = { 7: 'weekly', 14: 'fortnightly', 30: 'monthly' };
  const PERIOD = { 7: 'week', 14: 'fortnight', 30: 'month' };
  const CITY = c => (c === 'National' ? 'Australia-wide' : c);
  const track = (e, p) => { try { window.plausible && window.plausible(e, p ? { props: p } : undefined); } catch (_) {} };

  /* ---------- state: address bar first, then this device, then defaults ---------- */
  const S = Object.assign({}, DEF);
  const UI = { wCustom: false, baseDate: false, bpOpen: false };
  (function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (_) {}
    Object.assign(S, saved);
    const q = new URLSearchParams(location.search);
    Object.keys(DEF).forEach(k => { if (q.has(k)) S[k] = q.get(k); });
    S.w = +S.w || DEF.w; S.freq = +S.freq || DEF.freq; S.range = +S.range;
    if (!F.daily[S.city]) S.city = DEF.city;
    if (!BASIS[S.basis]) S.basis = DEF.basis;
    if (!FREQ[S.freq]) S.freq = DEF.freq;
    UI.wCustom = !W_PRESETS.includes(+S.w);
    UI.baseDate = /^\d{4}-/.test(S.base);
    UI.bpOpen = S.bp !== '';
  })();
  function save() {
    const q = new URLSearchParams();
    Object.keys(DEF).forEach(k => { if (S[k] !== '' && String(S[k]) !== String(DEF[k])) q.set(k, S[k]); });
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (_) {}
    try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (_) {}
  }
  const shareUrl = () => location.href.split('#')[0];

  /* ---------- data helpers ---------- */
  const series = () => F.daily[S.city];
  const first = () => series()[0][0];
  const latest = () => series()[series().length - 1][0];
  const clampDate = d => (!d ? latest() : d < first() ? first() : d > latest() ? latest() : d);
  const calcDate = () => clampDate(S.cd);
  function baseDate() {
    const cd = calcDate();
    if (S.base === 'fwc') return L.FWC_BASE;
    const m = /^(\d+)m$/.exec(S.base);
    if (m) return clampDate(L.addMonths(cd, -m[1]));
    return /^\d{4}-\d{2}-\d{2}$/.test(S.base) ? clampDate(S.base) : clampDate(L.addMonths(cd, -12));
  }
  const inputs = over => Object.assign({
    series: series(), calcDate: calcDate(), baseDate: baseDate(), basePrice: S.bp,
    days: S.freq, window: S.win, basis: S.basis, weight: S.w, rate: S.rate, lp100: S.lp
  }, over || {});

  /* ---------- formatting ---------- */
  const pct = (v, d = 2) => (v * 100).toFixed(d) + '%';
  const money = v => (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cpl = v => v.toFixed(1) + ' c/L';
  const D = L.fmtDate;
  const monthYear = iso => D(iso).replace(/^\d+ /, '');

  /* ---------- controls: reflect state ---------- */
  function setVal(id, v) { const el = $(id); if (document.activeElement !== el) el.value = v; }
  function press(sel, fn) { $$(sel).forEach(b => b.setAttribute('aria-pressed', fn(b) ? 'true' : 'false')); }
  function syncControls() {
    $$('input[name=freq]').forEach(r => { r.checked = +r.value === +S.freq; });
    $$('input[name=basis]').forEach(r => { r.checked = r.value === S.basis; });
    $$('input[name=win]').forEach(r => { r.checked = r.value === S.win; });
    $('basedate').min = $('calcdate').min = first(); $('basedate').max = $('calcdate').max = latest();
    setVal('basedate', baseDate()); setVal('baseprice', S.bp); setVal('calcdate', calcDate());
    setVal('weight', isNaN(S.w) ? '' : S.w); setVal('rate', S.rate); setVal('lp100', S.lp);
    press('#baseChips [data-base]', b => !S.bp && (b.dataset.base === 'date' ? UI.baseDate : !UI.baseDate && b.dataset.base === S.base));
    press('#wChips [data-w]', b => (b.dataset.w === 'custom' ? UI.wCustom : !UI.wCustom && +b.dataset.w === +S.w));
    press('#cityChips [data-city]', b => b.dataset.city === S.city);
    press('#lpChips [data-lp]', b => String(b.dataset.lp) === String(S.lp));
    press('#rangeChips [data-r]', b => +b.dataset.r === +S.range);
    $('baseDateBox').hidden = !UI.baseDate || !!S.bp;
    $('bpBox').hidden = !UI.bpOpen; $('bpToggle').setAttribute('aria-expanded', UI.bpOpen);
    $('bpToggle').textContent = UI.bpOpen ? 'Use the price on the date instead' : 'I know the diesel price in my rates';
    $('wBox').hidden = !UI.wCustom;
    const adv = [FREQ[S.freq], BASIS[S.basis], S.win === 'day' ? 'exact day' : null, S.cd ? 'as at ' + D(calcDate()) : null].filter(Boolean);
    $('advSum').textContent = adv.join(', ');
  }

  /* ---------- the result ---------- */
  let last = null, lastShown = null;
  function render() {
    const cd = calcDate(), bd = baseDate();
    $('dataDate').textContent = D(latest());
    $('cityname').textContent = CITY(S.city);
    const wBad = !(S.w >= 1 && S.w <= 80);
    $('wErr').textContent = wBad ? 'Enter a figure between 1% and 80%.' : '';
    const bpBad = S.bp !== '' && !(+S.bp >= 50 && +S.bp <= 500);
    $('baseErr').textContent = bpBad ? 'Enter a diesel price between 50 and 500 cents a litre.' : (!S.bp && bd >= cd ? 'That date is not before today’s prices. Pick an earlier date.' : '');
    const r = wBad || bpBad ? null : L.compute(inputs());
    last = r;
    syncControls(); save();
    if (!r) { $('levy').textContent = '–'; $('barLevy').textContent = '–'; $('jobOut').textContent = ''; return; }

    const txt = pct(r.levy);
    const big = $('levy');
    if (lastShown !== null && lastShown !== txt) { big.classList.remove('flash'); void big.offsetWidth; big.classList.add('flash'); }
    lastShown = txt;
    big.textContent = txt; big.classList.toggle('neg', r.levy < 0);
    $('barLevy').textContent = txt;

    /* the same levy one review period earlier, so people can see the trend */
    const prevDate = L.addDays(cd, -S.freq);
    const prev = prevDate >= first() ? L.compute(inputs({ calcDate: prevDate })) : null;
    if (prev) {
      const dv = (r.levy - prev.levy) * 100, up = dv > 0.005, down = dv < -0.005;
      $('delta').innerHTML = 'Last ' + PERIOD[S.freq] + ' it was ' + pct(prev.levy) +
        (up || down ? ' <b class="' + (up ? 'up' : 'down') + '">' + (up ? '▲ up ' : '▼ down ') + Math.abs(dv).toFixed(2) + '</b>' : ', no change');
    } else $('delta').textContent = '';

    /* then and now, like a fuel price board */
    $('thenP').textContent = r.baseInc.toFixed(1);
    $('nowP').textContent = r.curInc.toFixed(1);
    $('thenLbl').textContent = r.manual ? 'In your rates' : 'When your rates were set';
    $('thenD').textContent = r.manual ? 'your figure' : D(bd);
    $('nowD').textContent = D(cd);
    $('boardCap').textContent = 'Wholesale diesel, cents a litre inc GST, ' + CITY(S.city) + (S.win === 'day' ? '' : ', ' + FREQ[S.freq] + ' average') + '. ' +
      (r.diff >= 0 ? 'Up ' : 'Down ') + Math.abs(r.curInc - r.baseInc).toFixed(1) + 'c.';

    const rate = +S.rate;
    $('jobOut').innerHTML = rate > 0
      ? (r.levy >= 0 ? 'add <b>' + money(rate * r.levy) + '</b> fuel levy. Charge <b>' + money(rate * (1 + r.levy)) + '</b> in total, plus GST.'
        : 'take off <b>' + money(-rate * r.levy) + '</b>. Diesel is cheaper than when you set your rates.')
      : 'Type a job price to see the levy in dollars.';
    $('kmOut').innerHTML = r.cpk != null
      ? 'Add <b>' + r.cpk.toFixed(1) + ' cents per km</b>, or <b>' + money(r.cpk * 10) + '</b> per 1,000 km.'
      : 'Pick your truck or type its fuel use.';

    const win = S.win === 'day' ? 'price on the day' : FREQ[S.freq] + ' average';
    const rows = [
      ['Diesel now, ' + win + ' to ' + D(cd) + ', ' + BASIS[S.basis], cpl(r.cur)],
      ['Diesel in your rates, ' + (r.manual ? 'your figure' : win + ' to ' + D(bd)) + ', ' + BASIS[S.basis], cpl(r.base)],
      ['Change', (r.diff >= 0 ? '+' : '') + r.diff.toFixed(1) + ' c/L, which is ' + (r.pct >= 0 ? '+' : '') + (r.pct * 100).toFixed(2) + '%'],
      ['Fuel share of your costs', (r.weight * 100).toFixed(1) + '%'],
      ['Fuel levy = ' + (r.pct * 100).toFixed(2) + '% × ' + (r.weight * 100).toFixed(1) + '%', txt]
    ];
    $('workings').innerHTML = rows.map((x, i) => '<li' + (i === rows.length - 1 ? ' class="total"' : '') + '><span>' + x[0] + '</span><b>' + x[1] + '</b></li>').join('');
    let note = 'Prices are Australian Institute of Petroleum terminal gate prices, the wholesale price published every business day. Ex GST divides the published price by 1.1.';
    if (S.basis === 'net') {
      note += ' Fuel tax credit taken off: ' + r.ftcBase.ftc + ' c/L at the base date, ' + r.ftcCur.ftc + ' c/L now.';
      if (r.ftcBase.check || r.ftcCur.check) note += ' Rates before 3 Aug 2026 are excise less road user charge; confirm them with the ATO.';
    }
    $('taxNote').textContent = note;

    drawPrice(r); drawHist();
    if (!render.tracked) { render.tracked = true; track('Levy calculated', { city: S.city }); }
  }

  /* ---------- charts: SVG drawn at the box's real width, with a touch/mouse scrubber ---------- */
  function niceTicks(lo, hi, n) {
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw);
    const t = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(6)); return t;
  }
  function plot(el, cfg) {
    const W = Math.max(el.clientWidth, 260), H = cfg.h, padL = 40, padB = 22, padT = 8, iw = W - padL - 4, ih = H - padB - padT;
    const pts = cfg.data, n = pts.length;
    const x = i => padL + (n === 1 ? iw / 2 : i / (n - 1) * iw);
    const y = v => padT + ih - (v - cfg.min) / ((cfg.max - cfg.min) || 1) * ih;
    let g = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="' + cfg.label + '">';
    niceTicks(cfg.min, cfg.max, 4).forEach(t => {
      g += '<line x1="' + padL + '" x2="' + (W - 4) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="' + (t === 0 ? '#9AA9B5' : '#E4EAEE') + '"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y(t) + 4) + '" font-size="12" text-anchor="end" fill="#5E7180">' + cfg.tick(t) + '</text>';
    });
    g += cfg.marks(x, y, iw / Math.max(n, 1));
    [0, n - 1].forEach((i, k) => { g += '<text x="' + x(i) + '" y="' + (H - 4) + '" font-size="12" fill="#5E7180" text-anchor="' + ['start', 'end'][k] + '">' + D(pts[i][0]) + '</text>'; });
    g += '<line class="g" x1="0" x2="0" y1="' + padT + '" y2="' + (padT + ih) + '" stroke="#0A1630" stroke-dasharray="3 3" opacity="0"/><circle class="d" r="5" fill="#0A1630" stroke="#fff" stroke-width="2" opacity="0"/></svg><div class="fl-tip"></div>';
    el.innerHTML = g;
    const svg = el.querySelector('svg'), gl = svg.querySelector('.g'), dot = svg.querySelector('.d'), tip = el.querySelector('.fl-tip');
    function at(clientX) {
      const r = svg.getBoundingClientRect(), px = (clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round((px - padL) / iw * (n - 1))));
      const p = pts[i], cx = x(i), cy = y(p[1]);
      gl.setAttribute('x1', cx); gl.setAttribute('x2', cx); gl.setAttribute('opacity', 1);
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('opacity', 1);
      tip.innerHTML = D(p[0]) + '<br><b>' + cfg.fmt(p[1]) + '</b>';
      tip.style.left = Math.max(56, Math.min(r.width - 56, cx * r.width / W)) + 'px';
      tip.classList.add('on');
    }
    const off = () => { gl.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tip.classList.remove('on'); };
    el.onpointermove = e => at(e.clientX);
    el.onpointerdown = e => at(e.clientX);
    el.onpointerleave = off;
    el.onpointerup = e => { if (e.pointerType !== 'mouse') setTimeout(off, 2000); };
  }
  function drawPrice(r) {
    let s = series();
    if (S.range > 0) { const from = L.addMonths(latest(), -S.range); s = s.filter(p => p[0] >= from); }
    const base = r.baseInc, vals = s.map(p => p[1]);
    const lo = Math.min(...vals, base), hi = Math.max(...vals, base), pad = (hi - lo) * 0.08 || 5;
    plot($('chart'), {
      h: 230, data: s, min: lo - pad, max: hi + pad, label: 'Diesel price, ' + CITY(S.city),
      tick: t => t.toFixed(0) + 'c', fmt: v => v.toFixed(1) + 'c a litre',
      marks: (x, y) => '<polyline fill="none" stroke="#0A8FA3" stroke-width="2.5" stroke-linejoin="round" points="' + s.map((p, i) => x(i).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ') + '"/>' +
        '<line x1="40" x2="100%" y1="' + y(base) + '" y2="' + y(base) + '" stroke="#5A8F00" stroke-width="2" stroke-dasharray="6 4"/>' +
        '<text x="46" y="' + (y(base) - 7) + '" font-size="12.5" font-weight="700" fill="#3E6B00">in your rates: ' + base.toFixed(1) + 'c</text>'
    });
  }
  function drawHist() {
    const h = L.history(inputs(), 52);
    if (!h.length) { $('hist').innerHTML = ''; return; }
    const vals = h.map(p => p[1]);
    const lo = Math.min(0, ...vals), hi = Math.max(1, ...vals), pad = (hi - lo) * 0.08;
    plot($('hist'), {
      h: 230, data: h, min: lo - (lo < 0 ? pad : 0), max: hi + pad, label: 'Your fuel levy each week over the last year',
      tick: t => t + '%', fmt: v => 'levy ' + v.toFixed(2) + '%',
      marks: (x, y, bw) => h.map((p, i) => { const y0 = y(0), y1 = y(p[1]), w = Math.max(bw - 2, 1.5);
        return '<rect x="' + (x(i) - w / 2).toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(Math.abs(y0 - y1), 0.5).toFixed(1) + '" rx="1.5" fill="' + (p[1] >= 0 ? '#00A6B4' : '#6CB300') + '"/>'; }).join('')
    });
  }

  /* ---------- events ---------- */
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  let tmr; const soon = () => { clearTimeout(tmr); tmr = setTimeout(render, 150); };
  $$('#cityChips [data-city]').forEach(b => b.addEventListener('click', () => { S.city = b.dataset.city; render(); }));
  $$('#baseChips [data-base]').forEach(b => b.addEventListener('click', () => {
    S.bp = ''; UI.bpOpen = false;
    if (b.dataset.base === 'date') { UI.baseDate = true; S.base = baseDate(); render(); $('basedate').focus(); }
    else { UI.baseDate = false; S.base = b.dataset.base; render(); }
  }));
  on('basedate', 'change', e => { if (e.target.value) { S.base = e.target.value; render(); } });
  on('bpToggle', 'click', () => { UI.bpOpen = !UI.bpOpen; if (!UI.bpOpen) S.bp = ''; render(); if (UI.bpOpen) $('baseprice').focus(); });
  on('baseprice', 'input', e => { S.bp = e.target.value; soon(); });
  $$('#wChips [data-w]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.w === 'custom') { UI.wCustom = true; render(); $('weight').focus(); }
    else { UI.wCustom = false; S.w = +b.dataset.w; render(); }
  }));
  on('weight', 'input', e => { S.w = e.target.value === '' ? NaN : +e.target.value; soon(); });
  on('wcalc', 'click', () => { const open = $('wbox2').hidden; $('wbox2').hidden = !open; $('wcalc').setAttribute('aria-expanded', open); if (open) $('fuelcost').focus(); });
  ['fuelcost', 'totcost'].forEach(id => on(id, 'input', () => {
    const f = +$('fuelcost').value, t = +$('totcost').value;
    if (f > 0 && t > 0 && f < t) { S.w = +(f / t * 100).toFixed(1); $('weight').value = S.w; soon(); }
  }));
  $$('input[name=freq]').forEach(r => r.addEventListener('change', e => { S.freq = +e.target.value; render(); }));
  $$('input[name=basis]').forEach(r => r.addEventListener('change', e => { S.basis = e.target.value; render(); }));
  $$('input[name=win]').forEach(r => r.addEventListener('change', e => { S.win = e.target.value; render(); }));
  on('calcdate', 'change', e => { S.cd = e.target.value && e.target.value !== latest() ? e.target.value : ''; render(); });
  on('rate', 'input', e => { S.rate = e.target.value; soon(); });
  on('lp100', 'input', e => { S.lp = e.target.value; soon(); });
  $$('#lpChips [data-lp]').forEach(b => b.addEventListener('click', () => { S.lp = b.dataset.lp; render(); }));
  $$('#rangeChips [data-r]').forEach(b => b.addEventListener('click', () => { S.range = +b.dataset.r; render(); }));
  on('reset', 'click', () => { Object.assign(S, DEF); UI.wCustom = UI.baseDate = UI.bpOpen = false; render(); toast('Back to the defaults'); });
  if (S.lp) $('kmBox').open = true;

  /* ---------- send, copy, customer letter ---------- */
  function summary() {
    if (!last) return '';
    return 'Fuel levy ' + pct(last.levy) + '. Diesel ' + last.curInc.toFixed(1) + 'c/L now vs ' + last.baseInc.toFixed(1) + 'c/L in our rates (' +
      CITY(S.city) + ' wholesale, ' + FREQ[S.freq] + ' review to ' + D(calcDate()) + '), fuel ' + (last.weight * 100).toFixed(0) + '% of costs.';
  }
  let tt; function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400); }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (_) { window.prompt('Copy this', text); }
  }
  async function share() {
    track('Levy share');
    const data = { title: 'Fuel levy ' + (last ? pct(last.levy) : ''), text: summary() + ' Check the workings:', url: shareUrl() };
    if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    copy(summary() + ' Check the workings: ' + shareUrl(), 'Copied. Paste it into a text or email.');
  }
  function openNotice() {
    let n = {}; try { n = JSON.parse(localStorage.getItem('fx_levy_notice') || '{}'); } catch (_) {}
    $('nBiz').value = n.biz || ''; $('nCust').value = '';
    $('nFrom').value = L.addDays(new Date().toISOString().slice(0, 10), ((8 - new Date().getDay()) % 7) || 7);
    const d = $('noticeDlg');
    if (d.showModal) d.showModal(); else { buildNotice(); window.print(); }
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function buildNotice() {
    if (!last) return;
    const biz = $('nBiz').value.trim(), cust = $('nCust').value.trim(), from = $('nFrom').value;
    try { localStorage.setItem('fx_levy_notice', JSON.stringify({ biz })); } catch (_) {}
    let el = document.querySelector('.fl-notice');
    if (!el) { el = document.createElement('div'); el.className = 'fl-notice'; document.body.appendChild(el); }
    const rows = $$('#workings li').map(li => '<tr><td>' + esc(li.children[0].textContent) + '</td><td>' + esc(li.children[1].textContent) + '</td></tr>').join('');
    el.innerHTML =
      '<div class="nh"><div><h1>Fuel levy notice</h1><div class="small">Issued ' + D(new Date().toISOString().slice(0, 10)) + '</div></div><div class="biz">' + esc(biz) + '</div></div>' +
      (cust ? '<p>To: <b>' + esc(cust) + '</b></p>' : '') +
      '<p>From <b>' + (from ? D(from) : 'the next invoice') + '</b> the fuel levy on our base freight rates will be:</p>' +
      '<div class="lv">' + pct(last.levy) + '</div>' +
      '<p>' + (last.levy >= 0 ? 'It is added to the base rate on each invoice as a separate line. On a $1,000 job that is ' + money(1000 * last.levy) + ' plus GST.' : 'Diesel is below the price in our rates, so this is applied as a discount.') + '</p>' +
      '<p><b>Why</b><br>Wholesale diesel is ' + last.curInc.toFixed(1) + ' cents a litre now, against ' + last.baseInc.toFixed(1) + ' cents a litre when our rates were set. Fuel is ' + (last.weight * 100).toFixed(0) + '% of our running costs, so the levy recovers that share of the change.</p>' +
      '<table>' + rows + '</table>' +
      '<p class="small">' + esc($('taxNote').textContent) + ' Area: ' + CITY(S.city) + '.</p>' +
      '<p class="small">Worked out with the FREIGHTIX fuel levy calculator. Check it yourself: ' + esc(shareUrl()) + '</p>';
  }
  $('doPrint').addEventListener('click', () => { buildNotice(); $('noticeDlg').close(); track('Levy notice'); setTimeout(() => window.print(), 50); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'notice') openNotice();
    if (b.dataset.act === 'share') share();
    if (b.dataset.act === 'copy') { track('Levy link copied'); copy(shareUrl(), 'Link copied. It opens with your answers.'); }
  });
  window.addEventListener('beforeprint', () => { const n = document.querySelector('.fl-notice'); if (!n || !n.innerHTML) buildNotice(); });

  /* ---------- mobile bar: shows once the answer card scrolls out of view ---------- */
  const bar = $('flbar');
  new IntersectionObserver(es => es.forEach(e => {
    const show = !e.isIntersecting && e.boundingClientRect.top < 0;
    bar.classList.toggle('on', show); bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    bar.querySelectorAll('button').forEach(b => { b.tabIndex = show ? 0 : -1; });
  }), { threshold: 0 }).observe($('levy'));

  /* stale data warning: AIP publishes each business day */
  const age = (Date.now() - Date.parse(latest() + 'T00:00:00Z')) / 864e5;
  if (age > 7) { $('stale').hidden = false; $('stale').textContent = 'Heads up: the latest prices are ' + Math.floor(age) + ' days old'; }

  let rw; if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(rw); rw = setTimeout(() => last && (drawPrice(last), drawHist()), 100); }).observe($('chart'));
  render();
})();
