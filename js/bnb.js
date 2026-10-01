/* Spatial branch-and-bound demo (1-D, αBB underestimators).
   f is nonconvex with several local minima; each node [l,u] gets the convex
   underestimator L(x) = f(x) + α (x-l)(x-u), whose minimum is a valid lower bound. */
(function () {
  'use strict';
  const cv = document.getElementById('bnbCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);

  const X0 = 0, X1 = 6, ALPHA = 12, TOL = 1e-4, MAX_ITER = 200;
  const f = x => 0.6 * Math.sin(3.2 * x) + 0.35 * Math.sin(7.1 * x + 0.5) + 0.06 * (x - 2.6) ** 2 + 2;
  const L = (x, l, u) => f(x) + ALPHA * (x - l) * (x - u);

  function argminConvex(g, a, b) { // ternary search
    for (let k = 0; k < 60; k++) {
      const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
      if (g(m1) < g(m2)) b = m2; else a = m1;
    }
    return (a + b) / 2;
  }
  function edge(g, inside, outside, ub) { // boundary of {g <= ub} between inside/outside
    for (let k = 0; k < 40; k++) { const m = (inside + outside) / 2; if (g(m) <= ub) inside = m; else outside = m; }
    return inside;
  }

  let nodes, UB, xBest, iter, excluded, done, timer, history;

  function bound(node) {
    const g = x => L(x, node.l, node.u);
    node.x = argminConvex(g, node.l, node.u);
    node.lb = g(node.x);
    for (const c of [node.x, (node.l + node.u) / 2]) {
      const v = f(c); if (v < UB) { UB = v; xBest = c; }
    }
  }
  function tighten(node) {
    if (!$('bnbTighten').checked) return;
    for (let pass = 0; pass < 3; pass++) {
      const g = x => L(x, node.l, node.u);
      if (node.lb > UB) return;
      const a = g(node.l) <= UB ? node.l : edge(g, node.x, node.l, UB);
      const b = g(node.u) <= UB ? node.u : edge(g, node.x, node.u, UB);
      if (a - node.l < 1e-9 && node.u - b < 1e-9) return;
      if (a > node.l) excluded.push([node.l, a]);
      if (b < node.u) excluded.push([b, node.u]);
      node.l = a; node.u = b; bound(node);
    }
  }
  function canPrune(n) { return n.lb >= UB - TOL * Math.abs(UB); }
  function globalLB() { const open = nodes.filter(n => n.open); return open.length ? Math.min(...open.map(n => n.lb)) : UB; }

  function reset() {
    stop();
    UB = Infinity; xBest = null; iter = 0; excluded = []; done = false; history = [];
    // Start from a coarse uniform partition of the domain.
    nodes = [];
    for (let k = 0; k < 4; k++) nodes.push({ l: X0 + (X1 - X0) * k / 4, u: X0 + (X1 - X0) * (k + 1) / 4, open: true });
    nodes.forEach(bound); nodes.forEach(tighten);
    for (const o of nodes) if (canPrune(o)) { o.open = false; o.pruned = true; excluded.push([o.l, o.u]); }
    update();
  }
  function step() {
    if (done) return;
    const open = nodes.filter(n => n.open);
    if (!open.length || iter >= MAX_ITER) { done = true; update(); return; }
    const n = open.reduce((a, b) => (a.lb < b.lb ? a : b));
    if (canPrune(n)) { finish(); return; }
    iter++;
    n.open = false; n.split = true;
    const m = (n.l + n.u) / 2;
    for (const [l, u] of [[n.l, m], [m, n.u]]) {
      const c = { l, u, open: true };
      bound(c); tighten(c);
      nodes.push(c);
    }
    for (const o of nodes) if (o.open && canPrune(o)) { o.open = false; o.pruned = true; excluded.push([o.l, o.u]); }
    if (!nodes.some(o => o.open)) done = true;
    update();
  }
  function finish() { for (const o of nodes) if (o.open && canPrune(o)) { o.open = false; o.pruned = true; excluded.push([o.l, o.u]); } done = true; update(); }
  function run() {
    if (timer) { stop(); return; }
    if (done) reset();
    $('bnbRun').textContent = 'Pause';
    timer = setInterval(() => { step(); if (done) stop(); }, 260);
  }
  function stop() { clearInterval(timer); timer = null; const b = $('bnbRun'); if (b) b.textContent = 'Run'; }

  function update() {
    const lb = globalLB(), gap = UB === Infinity ? 1 : Math.max(0, (UB - lb) / Math.abs(UB));
    history.push(gap);
    $('bnbIter').textContent = iter;
    $('bnbOpen').textContent = nodes.filter(n => n.open).length;
    $('bnbUB').textContent = isFinite(UB) ? UB.toFixed(4) : '-';
    $('bnbLB').textContent = isFinite(lb) ? lb.toFixed(4) : '-';
    $('bnbGap').textContent = done ? (gap * 100).toFixed(3) + '% ✓ certified' : (gap * 100).toFixed(2) + '%';
    $('bnbGapBar').style.width = Math.min(100, Math.max(1, Math.sqrt(gap) * 100)) + '%';
    $('bnbStep').disabled = done;
    draw();
  }

  /* ---------- drawing ---------- */
  let W = 0, H = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W) return false;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  const xs = Array.from({ length: 400 }, (_, i) => X0 + (X1 - X0) * i / 399);
  const fv = xs.map(f), fMin = Math.min(...fv), fMax = Math.max(...fv);
  const Y0 = fMin - 1.4, Y1 = fMax + 0.3;

  function draw() {
    if (!size()) return;
    const cs = getComputedStyle(document.documentElement);
    const C = k => cs.getPropertyValue(k).trim();
    const pad = { l: 40, r: 12, t: 12, b: 46 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const px = x => pad.l + (x - X0) / (X1 - X0) * pw;
    const py = y => pad.t + (1 - (y - Y0) / (Y1 - Y0)) * ph;
    ctx.clearRect(0, 0, W, H);

    // axes
    ctx.strokeStyle = C('--line'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(pad.l + pw, pad.t + ph); ctx.stroke();
    ctx.fillStyle = C('--muted'); ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    for (let x = X0; x <= X1; x++) ctx.fillText(x, px(x), pad.t + ph + 13);
    ctx.textAlign = 'right';
    for (let y = Math.ceil(Y0); y <= Y1; y++) ctx.fillText(y, pad.l - 6, py(y) + 3);

    // excluded / pruned shading
    ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = C('--muted');
    for (const [a, b] of excluded) ctx.fillRect(px(a), pad.t, px(b) - px(a), ph);
    ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, pw, ph); ctx.clip();
    // underestimators on open nodes
    ctx.strokeStyle = C('--teal'); ctx.lineWidth = 1.6;
    for (const n of nodes) if (n.open) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const x = n.l + (n.u - n.l) * i / 60, y = L(x, n.l, n.u); i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y)); }
      ctx.stroke();
      ctx.fillStyle = C('--teal'); ctx.beginPath(); ctx.arc(px(n.x), py(n.lb), 3, 0, 6.283); ctx.fill();
    }
    // f
    ctx.strokeStyle = C('--text'); ctx.lineWidth = 2;
    ctx.beginPath(); xs.forEach((x, i) => (i ? ctx.lineTo(px(x), py(fv[i])) : ctx.moveTo(px(x), py(fv[i])))); ctx.stroke();
    // UB
    if (isFinite(UB)) {
      ctx.strokeStyle = C('--accent'); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad.l, py(UB)); ctx.lineTo(pad.l + pw, py(UB)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C('--accent'); ctx.beginPath(); ctx.arc(px(xBest), py(UB), 5.5, 0, 6.283); ctx.fill();
      ctx.strokeStyle = C('--surface'); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();

    // node strip
    const sy = pad.t + ph + 24;
    ctx.fillStyle = C('--muted'); ctx.textAlign = 'left'; ctx.fillText('nodes', 2, sy + 8);
    for (const n of nodes) {
      if (n.split) continue;
      ctx.fillStyle = n.open ? C('--teal') : C('--line');
      ctx.fillRect(px(n.l) + 0.5, sy, Math.max(1, px(n.u) - px(n.l) - 1), 10);
    }
  }

  $('bnbStep').addEventListener('click', () => { stop(); step(); });
  $('bnbRun').addEventListener('click', run);
  $('bnbReset').addEventListener('click', reset);
  $('bnbTighten').addEventListener('change', reset);
  window.addEventListener('resize', () => draw());
  window.addEventListener('themechange', () => draw());
  window.addEventListener('tabshown', e => { if (e.detail === 'tab-bnb') draw(); else stop(); });
  reset();
})();
