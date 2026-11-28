/* FREIGHTIX trip fuel check.
   Pick a lane and a truck, see the fuel bill for the run at today's diesel price and at last year's.
   Uses the same price data as the levy calculator (global F, wholesale terminal gate prices, cents a litre inc GST). */
(function () {
  if (typeof F === 'undefined' || !F.daily) return;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('trip')) return;

  var km = $('tr-km'), slider = $('tr-r'), lp = $('tr-lp'), city = $('tr-city');
  var back = false;

  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function fmt(n, dp) { return n.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
  function money(n) { return '$' + fmt(n, n < 100 ? 2 : 0); }

  // Price on or before a date.
  function priceAt(series, date) {
    var p = series[0];
    for (var i = 0; i < series.length; i++) { if (series[i][0] <= date) p = series[i]; else break; }
    return p;
  }

  F.cities.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c === 'National' ? 'Australia-wide average' : c;
    if (c === 'National') o.selected = true;
    city.appendChild(o);
  });
  try { // follow the city already chosen in the levy calculator
    var saved = JSON.parse(localStorage.getItem('fx_levy_v2') || '{}');
    if (saved.city && F.daily[saved.city]) city.value = saved.city;
  } catch (e) {}

  function press(group, btn) {
    group.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
  }

  function calc() {
    var series = F.daily[city.value] || F.daily.National;
    var now = series[series.length - 1];
    var d = new Date(now[0] + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    var then = priceAt(series, d.toISOString().slice(0, 10));

    var dist = num(km.value) * (back ? 2 : 1);
    var litres = dist * num(lp.value) / 100;
    var costNow = litres * now[1] / 100;
    var costThen = litres * then[1] / 100;
    var diff = costNow - costThen;

    $('tr-cost').textContent = money(costNow);
    $('tr-sub').textContent = fmt(dist, 0) + ' km' + (back ? ' there and back' : ' one way') + ' at ' + fmt(now[1], 1) + ' cents a litre.';
    $('tr-l').textContent = fmt(litres, 0) + ' L';
    $('tr-km-cost').textContent = dist ? fmt(costNow / dist * 100, 1) + ' c' : '0 c';
    $('tr-then').textContent = money(costThen);
    $('tr-then-l').textContent = 'Same run a year ago, at ' + fmt(then[1], 1) + ' c';
    var up = diff >= 0;
    $('tr-diff').textContent = (up ? '+' : '-') + money(Math.abs(diff));
    $('tr-diff').style.color = up ? '#FFB224' : '#B9F23C';
    $('tr-diff-l').textContent = up ? 'Extra fuel cost on this run compared with a year ago' : 'Fuel saving on this run compared with a year ago';
    var max = Math.max(costNow, costThen) || 1;
    $('tr-b1').style.width = (costThen / max * 100) + '%';
    $('tr-b2').style.width = (costNow / max * 100) + '%';
    $('tr-date').textContent = now[0].split('-').reverse().join('/');
  }

  $('tr-lanes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    press(this, b);
    km.value = fmt(+b.dataset.km, 0); slider.value = b.dataset.km; calc();
  });
  $('tr-trucks').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    press(this, b);
    lp.value = b.dataset.lp; calc();
  });
  $('tr-back').addEventListener('click', function () {
    back = !back; this.setAttribute('aria-pressed', back ? 'true' : 'false'); calc();
  });
  km.addEventListener('input', function () {
    press($('tr-lanes'), null);
    var n = num(km.value); if (n >= +slider.min && n <= +slider.max) slider.value = n;
    calc();
  });
  slider.addEventListener('input', function () { press($('tr-lanes'), null); km.value = fmt(+slider.value, 0); calc(); });
  lp.addEventListener('input', function () { press($('tr-trucks'), null); calc(); });
  city.addEventListener('change', calc);
  calc();
})();
