/*!
 * Sam Clapp splash interstitial
 * Include in <head> of every page, no defer/async:
 *   <script src="/splash.js"></script>
 * Plays a short "tootling" logo animation on arrival and when clicking
 * links to other pages on the same site. Skips itself inside iframes
 * (e.g. Google Sites embeds) and respects "reduce motion".
 */
(function () {
  'use strict';

  // Don't splash when embedded (Google Sites iframe, etc.)
  try { if (window.top !== window.self) return; } catch (e) { return; }

  var REDUCE = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FLAG = 'sc-splash-nav';
  var OUT_MS = 550;      // how long the splash plays before leaving the page
  var ARRIVE_MS = 1000;  // minimum splash time on a fresh arrival
  var CARRY_MS = 600;    // minimum splash time when arriving via a splash click
  var BG = '#f6f0e1';    // cream paper

  // Logo bars: x, top-y, colour (bottom is always y=56)
  var BARS = [
    [14, 36, '#223A80'], [30, 20, '#7C2E2C'], [46, 28, '#D7A82E'],
    [62, 12, '#2F6742'], [78, 24, '#223A80'], [94, 16, '#7C2E2C'],
    [110, 32, '#D7A82E']
  ];
  var DURS = [0.9, 1.1, 0.8, 1.2, 0.95, 1.05, 0.85];

  function barSvg() {
    var s = '<svg class="sc-logo" viewBox="0 0 124 62" width="186" height="93" ' +
      'fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    for (var i = 0; i < BARS.length; i++) {
      var b = BARS[i], x = b[0], top = b[1], c = b[2];
      s += '<line x1="' + x + '" y1="56" x2="' + x + '" y2="' + top +
        '" stroke="' + c + '" stroke-width="5" stroke-linecap="round">';
      if (!REDUCE) {
        var up = Math.max(top - 8, 4), down = Math.min(top + 12, 48);
        var v = [top, up, down, top].join(';');
        s += '<animate attributeName="y2" values="' + v + '" dur="' + DURS[i] +
          's" begin="-' + (i * 0.17).toFixed(2) + 's" repeatCount="indefinite" ' +
          'calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/>';
      }
      s += '</line>';
    }
    return s + '</svg>';
  }

  var css =
    '#sc-splash{position:fixed;inset:0;z-index:2147483647;background:' + BG + ';' +
    'display:flex;align-items:center;justify-content:center;opacity:0;' +
    'pointer-events:none;transition:opacity .28s ease}' +
    '#sc-splash.on{opacity:1;pointer-events:auto}' +
    '#sc-splash.instant{transition:none}' +
    '#sc-splash .sc-logo{display:block;overflow:visible}';

  var style = document.createElement('style');
  style.id = 'sc-splash-style';
  style.appendChild(document.createTextNode(css));

  var overlay = document.createElement('div');
  overlay.id = 'sc-splash';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = barSvg();

  // Insert as early as possible (script lives in <head>)
  var root = document.documentElement;
  root.appendChild(style);
  root.appendChild(overlay);

  function show(instant) {
    overlay.className = instant ? 'instant on' : 'on';
  }
  function hide() { overlay.className = ''; }

  // --- Arrival ---
  var started = Date.now();
  var carried = false;
  try { carried = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch (e) {}
  show(true); // cover the page immediately, no fade-in

  function finishArrival() {
    var min = carried ? CARRY_MS : ARRIVE_MS;
    var wait = Math.max(0, min - (Date.now() - started));
    setTimeout(hide, wait);
  }
  if (document.readyState === 'complete') finishArrival();
  else window.addEventListener('load', finishArrival);
  setTimeout(hide, 6000); // safety net

  // Back/forward cache: never show a stale splash
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });

  // --- Leaving: intercept internal link clicks ---
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    if (a.hasAttribute('download')) return;
    var t = a.getAttribute('target');
    if (t && t !== '_self') return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same-page / hash link
    if (/\.(pdf|zip|ics|mxl|xml|musicxml|png|jpe?g|gif|svg)$/i.test(url.pathname)) return; // files

    e.preventDefault();
    try { sessionStorage.setItem(FLAG, '1'); } catch (err) {}
    show(false);
    setTimeout(function () { location.href = url.href; }, OUT_MS);
  }, false);
})();
