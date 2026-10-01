/* Grid-aware EV charging demo on a 12-bus radial feeder (LinDistFlow). */
(function () {
  'use strict';
  const svg = document.getElementById('feederSvg'); if (!svg) return;
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';

  // Bus 0 = substation. parent[i] gives the radial tree.
  const parent = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 3, 9, 5, 11];
  const pos = [[40, 110], [110, 110], [180, 110], [250, 110], [320, 110], [390, 110], [460, 110], [530, 110], [600, 110],
               [290, 205], [330, 295], [430, 205], [470, 295]];
  const demand = [0, 2, 3, 3, 2, 4, 4, 7, 8, 3, 6, 5, 7];  // EV charging demand (relative units)
  const baseP = 0.05, baseQ = 0.018;                       // per-bus load, p.u. on 1 MVA
  const R = 0.0065, X = 0.0045;                            // per-segment impedance, p.u.
  const EV_P = 0.15, PER_CHARGER = 3, VMIN = 0.95, MAX_PER_BUS = 4, BUDGET = 8;
  const N = parent.length;
  const kids = Array.from({ length: N }, () => []);
  parent.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
  let ev = new Array(N).fill(0);

  function solve(evs) {
    const P = new Array(N).fill(0), Q = new Array(N).fill(0);
    const order = []; (function dfs(i) { order.push(i); kids[i].forEach(dfs); })(0);
    for (let k = order.length - 1; k >= 0; k--) {
      const i = order[k];
      P[i] += i ? baseP + evs[i] * EV_P : 0; Q[i] += i ? baseQ : 0;
      if (parent[i] >= 0) { P[parent[i]] += P[i]; Q[parent[i]] += Q[i]; }
    }
    const v = new Array(N).fill(1);
    for (const i of order) if (i) v[i] = v[parent[i]] - 2 * (R * P[i] + X * Q[i]);
    return { V: v.map(x => Math.sqrt(Math.max(x, 0))), P };
  }
  const served = evs => {
    let s = 0, t = 0;
    for (let i = 1; i < N; i++) { s += Math.min(demand[i], evs[i] * PER_CHARGER); t += demand[i]; }
    return s / t;
  };
  const feasible = evs => Math.min(...solve(evs).V.slice(1)) >= VMIN - 1e-9;

  function place(gridAware) {
    const e = new Array(N).fill(0);
    if (!gridAware) { // chase the largest unmet demand, ignoring the grid
      for (let k = 0; k < BUDGET; k++) {
        let bi = 1;
        for (let i = 2; i < N; i++) {
          const u = demand[i] - e[i] * PER_CHARGER, ub = demand[bi] - e[bi] * PER_CHARGER;
          if (u > ub || (u === ub && demand[i] > demand[bi])) bi = i;
        }
        e[bi]++;
      }
      return e;
    }
    for (let k = 0; k < BUDGET; k++) {
      let best = null;
      for (let i = 1; i < N; i++) {
        if (e[i] >= MAX_PER_BUS) continue;
        e[i]++;
        const ok = !gridAware || feasible(e), gain = served(e), vmin = Math.min(...solve(e).V.slice(1));
        e[i]--;
        if (!ok) continue;
        if (!best || gain > best.gain + 1e-12 || (Math.abs(gain - best.gain) < 1e-12 && vmin > best.vmin)) best = { i, gain, vmin };
      }
      if (!best) break;
      e[best.i]++;
    }
    return e;
  }

  /* ---------- render ---------- */
  function el(tag, attrs, parentEl) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parentEl) parentEl.appendChild(n);
    return n;
  }
  const gLines = el('g', {}, svg), gFlow = el('g', {}, svg), gBus = el('g', {}, svg);
  const flowPaths = [], busEls = [];
  for (let i = 1; i < N; i++) {
    const [x1, y1] = pos[parent[i]], [x2, y2] = pos[i];
    el('line', { x1, y1, x2, y2, class: 'fd-line' }, gLines);
    flowPaths[i] = el('path', { d: `M${x1} ${y1} L${x2} ${y2}`, class: 'fd-flow' }, gFlow);
  }
  const sub = el('g', { class: 'fd-sub' }, gBus);
  el('rect', { x: pos[0][0] - 16, y: pos[0][1] - 16, width: 32, height: 32, rx: 6 }, sub);
  el('path', { d: `M${pos[0][0] + 2} ${pos[0][1] - 11} l-8 12 h6 l-2 10 l9 -13 h-6z`, fill: '#111' }, sub);
  const st = el('text', { x: pos[0][0], y: pos[0][1] + 32, 'text-anchor': 'middle' }, sub); st.textContent = 'SUB';

  for (let i = 1; i < N; i++) {
    const [x, y] = pos[i];
    const g = el('g', { class: 'fd-bus', tabindex: 0, role: 'button', 'aria-label': `Bus ${i}, EV demand ${demand[i]}` }, gBus);
    el('circle', { cx: x, cy: y, r: 13 + demand[i] * 2.4, class: 'demand' }, g);
    el('circle', { cx: x, cy: y, r: 12, class: 'core' }, g);
    const t = el('text', { x, y: y + 3.5, 'text-anchor': 'middle' }, g); t.textContent = i;
    const badge = el('g', { visibility: 'hidden' }, g);
    el('rect', { x: x - 17, y: y - 44, width: 34, height: 18, rx: 9, class: 'evbg' }, badge);
    const bt = el('text', { x, y: y - 31.5, 'text-anchor': 'middle', class: 'ev' }, badge);
    busEls[i] = { g, badge, bt };

    let pressT, longPressed = false;
    g.addEventListener('click', () => { if (longPressed) { longPressed = false; return; } bump(i, +1); });
    g.addEventListener('contextmenu', e => { e.preventDefault(); bump(i, -1); });
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(i, +1); }
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); bump(i, -1); }
    });
    g.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') pressT = setTimeout(() => { longPressed = true; bump(i, -1); }, 550); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => g.addEventListener(t, () => clearTimeout(pressT)));
  }
  // legend text inside svg
  const lg = el('text', { x: 620, y: 345, 'text-anchor': 'end', style: 'font:500 10px var(--font-mono);fill:var(--muted)' }, svg);
  lg.textContent = 'halo size = EV demand · ⚡ = 150 kW chargers';

  // voltage bars
  const vBars = $('vBars');
  const lim = document.createElement('div'); lim.className = 'limit';
  const VLO = 0.92, VHI = 1.0;
  lim.style.bottom = ((VMIN - VLO) / (VHI - VLO) * 100) + '%';
  vBars.appendChild(lim);
  const bars = [];
  for (let i = 1; i < N; i++) { const b = document.createElement('i'); b.dataset.label = i; vBars.appendChild(b); bars[i] = b; }

  function bump(i, d) { ev[i] = Math.max(0, Math.min(MAX_PER_BUS, ev[i] + d)); render(); }

  function render() {
    const { V, P } = solve(ev);
    const vmin = Math.min(...V.slice(1)), ok = vmin >= VMIN - 1e-9;
    const maxP = Math.max(...P.slice(1));
    for (let i = 1; i < N; i++) {
      const b = busEls[i], viol = V[i] < VMIN - 1e-9;
      b.g.classList.toggle('is-viol', viol);
      b.badge.setAttribute('visibility', ev[i] ? 'visible' : 'hidden');
      b.bt.textContent = '⚡' + ev[i];
      b.g.setAttribute('aria-label', `Bus ${i}, EV demand ${demand[i]}, ${ev[i]} chargers, voltage ${V[i].toFixed(3)} per unit`);
      const h = Math.max(2, Math.min(100, (V[i] - VLO) / (VHI - VLO) * 100));
      bars[i].style.height = h + '%';
      bars[i].classList.toggle('is-viol', viol);
      bars[i].title = `Bus ${i}: ${V[i].toFixed(3)} p.u.`;
      const fp = flowPaths[i];
      fp.style.strokeWidth = (1.5 + 4 * P[i] / maxP).toFixed(2);
      fp.style.animationDuration = (1.6 - 1.2 * P[i] / maxP).toFixed(2) + 's';
    }
    const n = ev.reduce((a, b) => a + b, 0);
    $('fdCount').textContent = n;
    $('fdServed').textContent = Math.round(served(ev) * 100) + '%';
    $('fdVmin').textContent = vmin.toFixed(3) + ' pu';
    const s = $('fdStatus');
    s.textContent = ok ? 'Feasible ✓' : 'Violation ✗';
    s.style.color = ok ? 'var(--ok)' : 'var(--danger)';
  }

  $('fdOptimize').addEventListener('click', () => { ev = place(true); render(); window.toast && toast('Grid-aware: max demand served within voltage limits'); });
  $('fdNaive').addEventListener('click', () => { ev = place(false); render(); window.toast && toast('Demand-only: check the far end of the feeder'); });
  $('fdClear').addEventListener('click', () => { ev = new Array(N).fill(0); render(); });
  render();

  // expose for testing
  window.__feeder = { solve, place, served, feasible };
})();
