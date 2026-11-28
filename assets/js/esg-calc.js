/* FREIGHTIX ESG emissions calculator.
   Diesel litres in, tonnes of CO2e out. Runs entirely in the browser.
   Factors: National Greenhouse Accounts Factors 2026, heavy duty diesel vehicles, Euro IV or higher. */
(function () {
  var GJ_PER_KL = 38.6;      // energy in a kilolitre of diesel
  var SCOPE1 = 70.37;        // kg CO2e per GJ, burned in the truck
  var SCOPE3 = 17.3;         // kg CO2e per GJ, producing and delivering the fuel

  var $ = function (id) { return document.getElementById(id); };
  if (!$('calc')) return;
  var litres = $('ec-l'), range = $('ec-r'), km = $('ec-k'), load = $('ec-t');
  var mult = 1;

  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function fmt(n, dp) { return n.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
  function tonnes(n) { return fmt(n, n < 100 ? 1 : n < 1000 ? 1 : 0) + ' t'; }

  var last = '';
  function calc() {
    var L = num(litres.value) * mult;            // litres per year
    var kl = L / 1000;
    var s1 = kl * GJ_PER_KL * SCOPE1 / 1000;     // tonnes
    var s3 = kl * GJ_PER_KL * SCOPE3 / 1000;
    var tot = s1 + s3;
    $('ec-tot').textContent = fmt(tot, tot < 1000 ? 1 : 0);
    $('ec-s1').textContent = tonnes(s1);
    $('ec-s3').textContent = tonnes(s3);
    $('ec-ba').style.width = (tot ? s1 / tot * 100 : 80) + '%';
    $('ec-bb').style.width = (tot ? s3 / tot * 100 : 20) + '%';

    var K = num(km.value) * mult, T = num(load.value);
    var perKm = K ? tot * 1000 / K : 0;                 // kg per km
    var perTkm = K && T ? tot * 1e6 / (K * T) : 0;      // g per tonne km
    $('ec-km-row').hidden = !K;
    $('ec-tkm-row').hidden = !(K && T);
    if (K) $('ec-km').textContent = fmt(perKm, 2) + ' kg CO2e';
    if (K && T) $('ec-tkm').textContent = fmt(perTkm, 0) + ' g CO2e';

    $('ec-m').textContent = 'The maths: ' + fmt(kl, 1) + ' kL x 38.6 GJ x 70.37 kg / 1,000 = ' + fmt(s1, 1) +
      ' t Scope 1. ' + fmt(kl, 1) + ' kL x 38.6 GJ x 17.3 kg / 1,000 = ' + fmt(s3, 1) + ' t Scope 3.';

    last = 'Estimated emissions from diesel, per year\n' +
      'Diesel used: ' + fmt(L, 0) + ' litres\n' +
      'Scope 1 (fuel burned): ' + fmt(s1, 1) + ' t CO2e\n' +
      'Scope 3 (fuel production and delivery): ' + fmt(s3, 1) + ' t CO2e\n' +
      'Total, well to wheel: ' + fmt(tot, 1) + ' t CO2e\n' +
      (K ? 'Per kilometre: ' + fmt(perKm, 2) + ' kg CO2e\n' : '') +
      (K && T ? 'Per tonne kilometre: ' + fmt(perTkm, 0) + ' g CO2e\n' : '') +
      'Method: National Greenhouse Accounts Factors 2026, heavy duty diesel vehicles (38.6 GJ/kL, 70.37 and 17.3 kg CO2e/GJ). Estimate only.\n' +
      'Calculated with the FREIGHTIX ESG calculator.';
  }

  litres.addEventListener('input', function () {
    var n = num(litres.value);
    if (n >= +range.min && n <= +range.max) range.value = n;
    calc();
  });
  litres.addEventListener('blur', function () { var n = num(litres.value); if (n) litres.value = fmt(n, 0); });
  range.addEventListener('input', function () { litres.value = fmt(+range.value, 0); calc(); });
  [km, load].forEach(function (i) { i.addEventListener('input', calc); });
  $('ec-p').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    mult = +b.dataset.m;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    calc();
  });
  $('ec-copy').addEventListener('click', function () {
    var btn = this, done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy this for a customer'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(last).then(done, function () { window.prompt('Copy this text', last); });
    else window.prompt('Copy this text', last);
  });
  $('ec-print').addEventListener('click', function () { window.print(); });
  calc();
})();
