(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Theme ---------- */
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (!root.hasAttribute('data-theme')) root.setAttribute('data-theme', systemDark.matches ? 'dark' : 'light');
  $('#themeToggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  window.toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 1800);
  };
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) { toast('Copy failed: select and copy manually'); }
  }
  window.copyText = copy;

  /* ---------- Nav ---------- */
  const nav = $('.nav'), links = $('#navLinks'), menuBtn = $('#menuToggle');
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => { links.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
  window.addEventListener('scroll', () => nav.classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });

  // Scroll-spy
  const sections = $$('#navLinks a').map(a => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        $$('#navLinks a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Reveal + counters ---------- */
  $$('.section__head, .card, .pipeline, .demo, .timeline li, .news li, .contact__card').forEach(el => el.classList.add('reveal'));
  const rev = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); rev.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => rev.observe(el));

  function animateCount(el) {
    const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || '0', 10);
    if (to === 0 || reduceMotion) { el.textContent = to.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur), v = to * (1 - Math.pow(1 - p, 3));
      el.textContent = v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } }), { threshold: .6 });
  $$('.count').forEach(c => cio.observe(c));

  // Hero "gap → 0.00%" ticker: converges like a solver log.
  (function gapTicker() {
    const el = $('#gapTicker'); if (!el || reduceMotion) return;
    let gap = 38.4;
    const iv = setInterval(() => {
      gap = gap * 0.62;
      if (gap < 0.005) { gap = 0; clearInterval(iv); }
      el.textContent = gap.toFixed(2);
    }, 160);
  })();

  /* ---------- Hero grid canvas ---------- */
  (function heroGrid() {
    const cv = $('#gridCanvas'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, nodes = [], edges = [], particles = [], raf, visible = true, colors;
    const readColors = () => {
      const cs = getComputedStyle(root);
      colors = { line: cs.getPropertyValue('--line').trim(), accent: cs.getPropertyValue('--accent').trim(), teal: cs.getPropertyValue('--teal').trim(), muted: cs.getPropertyValue('--muted').trim() };
    };
    function rand(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = rand(7);
      const n = Math.round(Math.min(70, Math.max(24, W * H / 18000)));
      nodes = [];
      // Bias nodes toward the right side so text stays readable.
      for (let i = 0; i < n; i++) {
        const bx = W < 860 ? r() : 0.35 + 0.65 * Math.pow(r(), 0.8);
        nodes.push({ x: bx * W, y: r() * H, sub: false, ph: r() * 6.28 });
      }
      nodes[0].sub = true;
      // Radial tree (like a distribution feeder) via Prim's MST + a few ties.
      edges = []; const inT = [0], out = nodes.map((_, i) => i).slice(1);
      while (out.length) {
        let best = null;
        for (const a of inT) for (const b of out) {
          const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
          if (!best || d < best.d) best = { a, b, d };
        }
        edges.push([best.a, best.b]); inT.push(best.b); out.splice(out.indexOf(best.b), 1);
      }
      for (let k = 0; k < Math.round(n / 10); k++) {
        const a = Math.floor(r() * n), b = Math.floor(r() * n);
        if (a !== b) edges.push([a, b, true]);
      }
      particles = edges.filter(e => !e[2]).map(e => ({ e, t: r(), v: 0.002 + r() * 0.004 }));
    }
    function draw(time) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1.2;
      for (const [a, b, tie] of edges) {
        ctx.strokeStyle = colors.line; ctx.setLineDash(tie ? [3, 5] : []);
        ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const p of particles) {
        if (!reduceMotion) { p.t += p.v; if (p.t > 1) p.t -= 1; }
        const A = nodes[p.e[0]], B = nodes[p.e[1]];
        const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
        ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const nd of nodes) {
        const s = nd.sub ? 5 : 2.6 + Math.sin(time / 900 + nd.ph) * 0.6;
        ctx.fillStyle = nd.sub ? colors.accent : colors.teal;
        ctx.globalAlpha = nd.sub ? 1 : 0.75;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, s, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion && visible) raf = requestAnimationFrame(draw);
    }
    readColors(); build(); draw(0);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduceMotion) draw(0); }, 150); });
    window.addEventListener('themechange', () => { readColors(); if (reduceMotion) draw(0); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduceMotion) raf = requestAnimationFrame(draw);
    }).observe(cv);
  })();

  /* ---------- Tabs ---------- */
  const tabs = $$('.tabs [role="tab"]');
  function selectTab(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    window.dispatchEvent(new CustomEvent('tabshown', { detail: tab.id }));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(n); n.focus();
      }
    });
  });

  // Deep links: #bnb or #feeder open the matching demo.
  const deep = { '#bnb': 'tab-bnb', '#feeder': 'tab-feeder' }[location.hash];
  if (deep) { selectTab($('#' + deep)); $('#lab').scrollIntoView(); }

  /* ---------- Publications ---------- */
  const ME = 'B. Panthee';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function bibtex(p) {
    const kind = p.type === 'journal' ? 'article' : p.type === 'conference' ? 'inproceedings' : 'misc';
    const fields = [
      `  title     = {${p.title}}`,
      `  author    = {${p.authors.join(' and ')}}`,
      `  year      = {${p.year}}`,
      p.type === 'journal' ? `  journal   = {${p.venue}}` : p.type === 'conference' ? `  booktitle = {${p.venue.split(';')[0]}}` : `  note      = {${p.venue}}`,
    ];
    if (p.links.doi) fields.push(`  doi       = {${p.links.doi.replace('https://doi.org/', '')}}`);
    if (p.links.arxiv) fields.push(`  eprint    = {${p.links.arxiv.split('/').pop()}}`, '  archivePrefix = {arXiv}');
    return `@${kind}{${p.bibkey},\n${fields.join(',\n')}\n}`;
  }
  const LABEL = { journal: 'Journal', conference: 'Conference', preprint: 'Preprint', working: 'In progress' };
  const LINKNAME = { pdf: 'PDF', arxiv: 'arXiv', doi: 'DOI', url: 'Paper', code: 'Code', slides: 'Slides' };
  let filter = 'all', query = '';
  function renderPubs() {
    const list = $('#pubList');
    const pubs = (window.PUBLICATIONS || [])
      .filter(p => filter === 'all' || p.type === filter)
      .filter(p => !query || (p.title + ' ' + p.authors.join(' ') + ' ' + p.venue).toLowerCase().includes(query))
      .sort((a, b) => b.year - a.year);
    if (!pubs.length) { list.innerHTML = '<li class="pubs__empty">No publications match.</li>'; return; }
    list.innerHTML = pubs.map((p, i) => {
      const authors = p.authors.map(a => a === ME ? `<span class="me">${esc(a)}</span>` : esc(a)).join(', ');
      const links = Object.entries(p.links).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${LINKNAME[k] || k}</a>`).join('');
      return `<li class="pub">
        <div><div class="pub__year">${p.year}<span class="pub__badge pub__badge--${p.type}">${LABEL[p.type]}</span></div></div>
        <div>
          <h3>${esc(p.title)}</h3>
          <p class="pub__authors">${authors}</p>
          <p class="pub__venue">${esc(p.venue)}</p>
          ${p.highlight ? `<p class="pub__hl">${esc(p.highlight)}</p>` : ''}
          <div class="pub__links">${links}
            <button type="button" data-bib="${i}" aria-expanded="false">BibTeX</button>
            <button type="button" data-copy="${i}">Copy citation</button>
          </div>
          <pre class="pub__bib" id="bib-${i}">${esc(bibtex(p))}</pre>
        </div></li>`;
    }).join('');
    list.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.bib !== undefined) {
        const pre = $('#bib-' + b.dataset.bib), open = pre.classList.toggle('is-open');
        b.setAttribute('aria-expanded', open);
        if (open) copy(pre.textContent, 'BibTeX copied');
      } else if (b.dataset.copy !== undefined) {
        const p = pubs[+b.dataset.copy];
        copy(`${p.authors.join(', ')}, "${p.title}," ${p.venue}, ${p.year}.`, 'Citation copied');
      }
    };
  }
  $$('.filters .chip-btn').forEach(b => b.addEventListener('click', () => {
    $$('.filters .chip-btn').forEach(x => x.classList.toggle('is-active', x === b));
    filter = b.dataset.filter; renderPubs();
  }));
  $('#pubSearch').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderPubs(); });
  renderPubs();

  /* ---------- Misc ---------- */
  // Hide the CV button until assets/Bikram_Panthee_CV.pdf exists.
  const cvBtn = $('a[href$="_CV.pdf"]');
  if (cvBtn && location.protocol !== 'file:') fetch(cvBtn.getAttribute('href'), { method: 'HEAD' }).then(r => { if (!r.ok) cvBtn.hidden = true; }).catch(() => { cvBtn.hidden = true; });
  $('#copyEmail').addEventListener('click', e => copy(e.currentTarget.dataset.email, 'Email copied'));
  $('#year').textContent = new Date().getFullYear();
})();
