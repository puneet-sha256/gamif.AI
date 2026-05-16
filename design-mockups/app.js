// Shared script for all Gamif.AI mockup pages.
// 1) Injects a floating Light/Dark toggle on every page.
// 2) Persists the choice in localStorage and respects ?theme=dark from the gallery.
// 3) Forwards parent postMessage('set-theme', <light|dark>) so the gallery can sync iframes.

(function () {
  const STORAGE_KEY = 'gamifai-mockup-theme';
  const html = document.documentElement;

  function getInitialTheme() {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('theme');
    if (fromQuery === 'dark' || fromQuery === 'light') return fromQuery;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (_) { /* ignore */ }
    // Fierce theme defaults to dark — the vibe lives there.
    return html.getAttribute('data-theme') || 'dark';
  }

  function setTheme(mode, persist) {
    html.setAttribute('data-theme', mode);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { /* ignore */ }
    }
  }

  setTheme(getInitialTheme(), false);

  // Listen for parent gallery toggling
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'set-theme' && (e.data.value === 'light' || e.data.value === 'dark')) {
      setTheme(e.data.value, false);
    }
  });

  // Inject toggle button when DOM is ready, but skip if the page is the gallery
  function injectToggle() {
    if (document.body.dataset.noFab === 'true') return;
    if (document.querySelector('.theme-fab')) return;

    const btn = document.createElement('button');
    btn.className = 'theme-fab';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle theme');
    btn.innerHTML =
      '<span class="moon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>' +
      '<span class="sun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg></span>' +
      '<span class="theme-fab__label">Dark</span>';
    btn.querySelector('.theme-fab__label').textContent = html.getAttribute('data-theme') === 'dark' ? 'Light' : 'Dark';

    btn.addEventListener('click', function () {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next, true);
      btn.querySelector('.theme-fab__label').textContent = next === 'dark' ? 'Light' : 'Dark';
    });

    document.body.appendChild(btn);
  }

  // Inject a hidden SVG with shared gradient defs (flames, etc.) once.
  function injectSharedDefs() {
    if (document.getElementById('gamifai-svg-defs')) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = 'gamifai-svg-defs';
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.innerHTML =
      '<defs>' +
      '  <linearGradient id="flame-warm" x1="0" y1="1" x2="0" y2="0">' +
      '    <stop offset="0%"  stop-color="#f97316"/>' +
      '    <stop offset="55%" stop-color="#fb923c"/>' +
      '    <stop offset="100%" stop-color="#fde047"/>' +
      '  </linearGradient>' +
      '  <linearGradient id="flame-cool" x1="0" y1="1" x2="0" y2="0">' +
      '    <stop offset="0%"  stop-color="#0ea5e9"/>' +
      '    <stop offset="60%" stop-color="#22d3ee"/>' +
      '    <stop offset="100%" stop-color="#a5f3fc"/>' +
      '  </linearGradient>' +
      '  <linearGradient id="flame-violet" x1="0" y1="1" x2="0" y2="0">' +
      '    <stop offset="0%"  stop-color="#7c3aed"/>' +
      '    <stop offset="60%" stop-color="#a78bfa"/>' +
      '    <stop offset="100%" stop-color="#fbcfe8"/>' +
      '  </linearGradient>' +
      '  <linearGradient id="shard-grad" x1="0" y1="0" x2="1" y2="1">' +
      '    <stop offset="0%"  stop-color="#818cf8"/>' +
      '    <stop offset="50%" stop-color="#a78bfa"/>' +
      '    <stop offset="100%" stop-color="#22d3ee"/>' +
      '  </linearGradient>' +
      '  <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">' +
      '    <stop offset="0%"  stop-color="rgba(167,139,250,0.7)"/>' +
      '    <stop offset="100%" stop-color="rgba(167,139,250,0)"/>' +
      '  </radialGradient>' +
      '</defs>';
    document.body.appendChild(svg);
  }

  // Confetti burst — call window.gamifaiConfetti(stageEl) to fire it.
  window.gamifaiConfetti = function (stage, opts) {
    if (!stage) return;
    opts = opts || {};
    const count = opts.count || 70;
    const colors = opts.colors || ['#818cf8', '#a78bfa', '#22d3ee', '#fb7185', '#facc15', '#34d399'];
    stage.innerHTML = '';
    const w = stage.clientWidth || 600;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'confetti';
      const left = Math.random() * 100;
      const cx = (Math.random() - 0.5) * w * 0.8;
      const cr = (Math.random() * 720 - 360) + 'deg';
      const dur = 2.2 + Math.random() * 2.4 + 's';
      const delay = (Math.random() * 0.6) + 's';
      const cw = 6 + Math.random() * 8;
      const ch = 8 + Math.random() * 14;
      const radius = Math.random() > 0.5 ? '2px' : '50%';
      const color = colors[i % colors.length];
      el.style.cssText =
        '--cl:' + left + '%;' +
        '--cx:' + cx + 'px;' +
        '--cr:' + cr + ';' +
        '--cd:' + dur + ';' +
        '--cdelay:' + delay + ';' +
        '--cw:' + cw + 'px;' +
        '--ch:' + ch + 'px;' +
        '--cradius:' + radius + ';' +
        '--cb:' + color + ';';
      stage.appendChild(el);
    }
  };

  function init() {
    injectToggle();
    injectSharedDefs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
