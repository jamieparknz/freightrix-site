/* FREIGHTIX live map: glow, moving traffic, city beacons and a tap or hover card for every lane.
   Enhances the map the site build already draws (svg.ausmap). If this file fails to load, the plain map still works. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  var LABEL = { closed: 'Closed', incidents: 'Incidents', planned: 'Planned works', clear: 'Clear' };

  document.querySelectorAll('svg.ausmap').forEach(function (svg, idx) {
    if (svg.dataset.fx) return;
    svg.dataset.fx = '1';
    var uid = idx ? '-' + idx : '';

    // Land gradient, soft shadow and a dot grid behind the country.
    var defs = svg.querySelector('defs') || svg.insertBefore(el('defs', {}), svg.firstChild);
    defs.insertAdjacentHTML('beforeend',
      '<linearGradient id="fxland' + uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123A5E"/><stop offset="1" stop-color="#0B2742"/></linearGradient>' +
      '<filter id="fxshadow' + uid + '" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#00E5F0" flood-opacity=".16"/></filter>' +
      '<pattern id="fxdots' + uid + '" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#1C4366"/></pattern>');
    var states = svg.querySelector('.states');
    // Dark panel or light page? Read the land colour the page already uses.
    var sample = states && states.querySelector('path');
    var rgb = sample ? (getComputedStyle(sample).fill.match(/\d+/g) || []).map(Number) : [];
    var dark = rgb.length >= 3 ? (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) < 110 : !!svg.closest('.zonedk');
    if (states && dark) {
      svg.classList.add('fx-dark');
      states.classList.add('fx-shadow');
      states.setAttribute('filter', 'url(#fxshadow' + uid + ')');
      states.querySelectorAll('path').forEach(function (p) { p.style.fill = 'url(#fxland' + uid + ')'; });
      var vb = (svg.getAttribute('viewBox') || '0 0 1000 860').split(/\s+/).map(Number);
      var grid = el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], 'class': 'fx-grid' });
      grid.style.fill = 'url(#fxdots' + uid + ')';
      svg.insertBefore(grid, states);
    } else if (states) {
      // Light pages keep their flat land colour.
      states.querySelectorAll('path').forEach(function (p) { p.style.fill = ''; });
      svg.classList.add('fx-light');
    }

    // Each lane gets a soft casing underneath and a stream of moving dots on top.
    svg.querySelectorAll('.leg').forEach(function (leg) {
      var line = leg.querySelector('.line');
      if (!line) return;
      var d = line.getAttribute('d');
      var colour = line.getAttribute('stroke');
      leg.insertBefore(el('path', { 'class': 'fx-case', d: d, stroke: colour }), line);
      leg.appendChild(el('path', { 'class': 'fx-flow', d: d }));
      var t = leg.querySelector('title');
      if (t) {
        leg.dataset.tip = t.textContent;
        var a = leg.closest('a');
        if (a) a.setAttribute('aria-label', t.textContent);
        t.remove(); // the card below replaces the browser's own tooltip
      }
    });

    // Capital cities pulse.
    svg.querySelectorAll('circle.cap').forEach(function (c, i) {
      var halo = el('circle', { cx: c.getAttribute('cx'), cy: c.getAttribute('cy'), r: 5, 'class': 'fx-halo' });
      halo.style.animationDelay = (i * 0.35) + 's';
      c.parentNode.insertBefore(halo, c);
    });

    // The card.
    var wrap = document.createElement('div');
    wrap.className = 'fx-mapwrap';
    svg.parentNode.insertBefore(wrap, svg);
    wrap.appendChild(svg);
    var tip = document.createElement('div');
    tip.className = 'fx-tip';
    tip.setAttribute('role', 'status');
    wrap.appendChild(tip);

    function show(leg, x, y) {
      var raw = leg.dataset.tip || '';
      var cut = raw.lastIndexOf(': ');
      var name = cut > -1 ? raw.slice(0, cut) : raw;
      var rest = cut > -1 ? raw.slice(cut + 2) : '';
      var status = (leg.className.baseVal.match(/s-(closed|incidents|planned|clear)/) || [])[1] || 'clear';
      var unplanned = (rest.match(/(\d+) unplanned/) || [])[1];
      var closed = (rest.match(/(\d+) closed/) || [])[1];
      var facts = [];
      if (closed !== undefined) facts.push(closed + ' closed');
      if (unplanned !== undefined) facts.push(unplanned + ' unplanned incident' + (unplanned === '1' ? '' : 's'));
      tip.innerHTML = '<b>' + esc(name) + '</b><span class="fx-st ' + status + '">' + LABEL[status] + '</span>' +
        esc(facts.join(', ')) + '<small>' + (matchMedia('(hover:none)').matches ? 'Tap the lane again for the full list' : 'Click the lane for the full list') + '</small>';
      var w = wrap.getBoundingClientRect();
      var left = Math.min(Math.max(8, x - w.left + 16), w.width - 280);
      tip.style.left = left + 'px';
      tip.style.top = Math.max(8, y - w.top + 16) + 'px';
      tip.classList.add('on');
      svg.classList.add('fx-focus');
      svg.querySelectorAll('.leg.hl').forEach(function (l) { l.classList.remove('hl'); });
      leg.classList.add('hl');
    }
    function hide() {
      tip.classList.remove('on');
      svg.classList.remove('fx-focus');
      svg.querySelectorAll('.leg.hl').forEach(function (l) { l.classList.remove('hl'); });
    }

    var armed = null; // on touch screens the first tap shows the card, the second follows the link
    svg.querySelectorAll('.leg').forEach(function (leg) {
      var a = leg.closest('a');
      leg.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(leg, e.clientX, e.clientY); });
      leg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') show(leg, e.clientX, e.clientY); });
      leg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
      if (a) {
        a.addEventListener('focus', function () { var r = leg.getBoundingClientRect(); show(leg, r.left + r.width / 2, r.top + r.height / 2); });
        a.addEventListener('blur', hide);
        a.addEventListener('click', function (e) {
          if (!matchMedia('(hover:none)').matches) return;
          if (armed !== leg) { e.preventDefault(); armed = leg; show(leg, e.clientX, e.clientY); }
        });
      }
    });
    document.addEventListener('click', function (e) { if (!svg.contains(e.target)) { armed = null; hide(); } });

    // The list beside the map lights up its lane.
    document.querySelectorAll('[data-leghl]').forEach(function (row) {
      var leg = svg.querySelector('.leg[data-leg="' + row.dataset.leghl + '"]');
      if (!leg) return;
      row.addEventListener('mouseenter', function () { svg.classList.add('fx-focus'); leg.classList.add('hl'); });
      row.addEventListener('mouseleave', function () { svg.classList.remove('fx-focus'); leg.classList.remove('hl'); });
    });
  });
})();
