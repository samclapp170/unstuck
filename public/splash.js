/*! v3 (JS-driven tootling + random toot sound) —
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

  // Tootling: drive each bar's top with a sine wave (works in every browser;
  // the baseline at y=56 never moves).
  var lines = overlay.querySelectorAll('line');
  var raf = 0, t0 = 0;
  function frame(now) {
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    for (var i = 0; i < lines.length; i++) {
      var top = BARS[i][1];
      var y = top + 9 * Math.sin(2 * Math.PI * (t / DURS[i] + i * 0.19)) - 2;
      lines[i].setAttribute('y2', Math.max(6, Math.min(46, y)).toFixed(2));
    }
    raf = requestAnimationFrame(frame);
  }
  function startAnim() { if (!REDUCE && !raf) raf = requestAnimationFrame(frame); }
  function stopAnim() { if (raf) { cancelAnimationFrame(raf); raf = 0; t0 = 0; } }

  function show(instant) {
    overlay.className = instant ? 'instant on' : 'on';
    startAnim();
  }
  function hide() {
    overlay.className = '';
    setTimeout(stopAnim, 400); // after the fade-out
  }

  // --- Sound: a random "toot" each time the splash plays ---------------------
  // Clips live in /sounds/. Add a style by adding a file and a line here.
  // Browsers only allow sound after the visitor has interacted with the site,
  // so the first arrival may be silent; clicking any link unlocks it.
  var SOUNDS = [
    ['/sounds/toot-banjo.mp3', 0.85],
    ['/sounds/toot-flute.mp3', 0.75],
    ['/sounds/toot-guitar.mp3', 0.80],
    ['/sounds/toot-orchestra.mp3', 1.00]
  ];
  var MUTE_KEY = 'sc-splash-mute', LAST_KEY = 'sc-splash-last';
  function muted() { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } }
  function playToot() {
    if (muted() || !SOUNDS.length) return;
    try {
      var last = parseInt(sessionStorage.getItem(LAST_KEY), 10);
      var i = Math.floor(Math.random() * SOUNDS.length);
      if (SOUNDS.length > 1 && i === last) i = (i + 1 + Math.floor(Math.random() * (SOUNDS.length - 1))) % SOUNDS.length;
      sessionStorage.setItem(LAST_KEY, String(i));
      var a = new Audio(SOUNDS[i][0]);
      a.volume = SOUNDS[i][1];
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () {}); // blocked by autoplay policy: stay silent
    } catch (e) {}
  }
  function addMuteButton() {
    if (!SOUNDS.length || !document.body) return;
    var b = document.createElement('button');
    b.id = 'sc-mute'; b.type = 'button';
    function paint() {
      var m = muted();
      b.setAttribute('aria-label', m ? 'Turn splash sound on' : 'Mute splash sound');
      b.title = m ? 'Splash sound: off' : 'Splash sound: on';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
        (m ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>') + '</svg>';
    }
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      try { localStorage.setItem(MUTE_KEY, muted() ? '0' : '1'); } catch (err) {}
      paint();
      if (!muted()) playToot(); // preview on un-mute
    });
    paint();
    document.body.appendChild(b);
  }
  var css2 = '#sc-mute{position:fixed;right:14px;bottom:14px;z-index:2147483000;width:34px;height:34px;' +
    'display:flex;align-items:center;justify-content:center;border:1px solid #d9cfb8;border-radius:50%;' +
    'background:#f6f0e1;color:#5C564D;cursor:pointer;padding:0;opacity:.75;transition:opacity .15s}' +
    '#sc-mute:hover,#sc-mute:focus-visible{opacity:1}@media print{#sc-mute{display:none}}';
  style.appendChild(document.createTextNode(css2));
  if (document.body) addMuteButton(); else document.addEventListener('DOMContentLoaded', addMuteButton);

  // --- Arrival ---
  var started = Date.now();
  var carried = false;
  try { carried = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch (e) {}
  show(true); // cover the page immediately, no fade-in
  playToot();

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
