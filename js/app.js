(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^(https?:|mailto:|tel:|assets\/|\.?\/?[\w\-./]+$)/i.test(u || '') ? u : '#';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

const load = n => fetch(`data/${n}.json?v=${Date.now()}`).then(r => { if (!r.ok) throw new Error(n); return r.json(); });

const ICON = {
  mail: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  in: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.700V21h-4z"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z"/></svg>'
};

/* ---------- reveal on scroll ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px' }) : null;
const reveal = (root = document) => $$('.rv:not(.in)', root).forEach((el, i) => { el.style.setProperty('--d', Math.min(i % 6, 5) * .07 + 's'); io ? io.observe(el) : el.classList.add('in'); });

/* ---------- 3D tilt ---------- */
function tilt(el, max = 9) {
  if (!fine || reduce || el.dataset.tilt) return;
  el.dataset.tilt = 1;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(.5 - y) * max}deg) rotateY(${(x - .5) * max * 1.2}deg) translateZ(6px)`;
    el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}
const tiltAll = (root = document) => $$('.tilt', root).forEach(el => tilt(el));

/* ---------- render ---------- */
function renderProfile(p) {
  document.title = `${p.name} | ${p.title}`;
  $('#hName').textContent = p.name; $('#footName').textContent = p.name;
  $('#hTagline').textContent = p.tagline;
  $('#hPhoto').src = p.photo || 'assets/profile.jpg';
  $('#cvBtn').href = safeUrl(p.cv); if (!p.cv) $('#cvBtn').hidden = true;
  $('.role').innerHTML = `${esc(p.title).replace(/(Engineered Systems)/, '<span class="grad">$1</span>')}`;

  $('#stats').innerHTML = (p.stats || []).map(s => `<div class="glass stat tilt rv"><b data-n="${+s.value || 0}" data-s="${esc(s.suffix || '')}">0${esc(s.suffix || '')}</b><span>${esc(s.label)}</span></div>`).join('');
  $('#aboutText').innerHTML = (p.summary || []).map(t => `<p class="rv">${esc(t)}</p>`).join('');
  const fact = (ic, k, v, href) => `<li>${ICON[ic]}<div><b>${k}</b>${href ? `<a href="${esc(safeUrl(href))}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(v)}</a>` : esc(v)}</div></li>`;
  $('#facts').innerHTML = [
    p.location && fact('pin', 'Location', p.location),
    p.email && fact('mail', 'Email', p.email, 'mailto:' + p.email),
    p.phone && fact('phone', 'Phone', p.phone, 'tel:' + p.phone.replace(/\s/g, '')),
    p.linkedin && fact('in', 'LinkedIn', 'mdtariquzzamantanib', p.linkedin)].filter(Boolean).join('');

  $('#skills').innerHTML = (p.skills || []).map(g => `<article class="glass skill tilt rv"><h3><i></i>${esc(g.group)}</h3><ul>${(g.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></article>`).join('');
  $('#awards').innerHTML = (p.awards || []).map(a => `<article class="glass award tilt rv"><div class="ic">${ICON.star}</div><small>${esc(a.period)}</small><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></article>`).join('');
  $('#edu').innerHTML = (p.education || []).map(e => `<div class="edu"><b>${esc(e.degree)}</b><span>${esc(e.school)} · ${esc(e.period)}</span></div>`).join('');
  $('#langs').innerHTML = (p.languages || []).map(l => `<span class="tag">${esc(l)}</span>`).join('');
  $('#training').innerHTML = (p.training || []).map(l => `<span class="tag">${esc(l)}</span>`).join('');
  $('#contactLinks').innerHTML = [
    p.email && `<a class="btn primary" href="mailto:${esc(p.email)}">${ICON.mail} ${esc(p.email)}</a>`,
    p.phone && `<a class="btn ghost" href="tel:${esc(p.phone.replace(/\s/g, ''))}">${ICON.phone} ${esc(p.phone)}</a>`,
    p.linkedin && `<a class="btn ghost" href="${esc(safeUrl(p.linkedin))}" target="_blank" rel="noopener">${ICON.in} LinkedIn</a>`].filter(Boolean).join('');

  startTyped(p.roles || []);
  const counter = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; counter.unobserve(e.target);
    const t = +e.target.dataset.n, sfx = e.target.dataset.s, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 1400); e.target.textContent = Math.round(t * (1 - Math.pow(1 - k, 3))) + sfx; if (k < 1) requestAnimationFrame(step); };
    reduce ? e.target.textContent = t + sfx : requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-n]').forEach(n => counter.observe(n));
}

function renderExperience(list) {
  $('#timeline').innerHTML = list.map(j => `<article class="glass job tilt rv"><div class="job-top"><h3>${esc(j.role)}</h3><span class="when">${esc(j.period)}</span></div><div class="co">${esc(j.company)} · ${esc(j.location)}${j.note ? ` · <em>${esc(j.note)}</em>` : ''}</div><ul>${(j.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul></article>`).join('');
}

let projects = [], pCat = 'All', pQ = '', pLimit = 9;
const PAGE = 9;
function renderProjects() {
  const q = pQ.toLowerCase();
  const rows = projects.filter(p => (pCat === 'All' || p.category === pCat) && (!q || [p.client, p.title, p.category, p.description, ...(p.tech || [])].join(' ').toLowerCase().includes(q)));
  const shown = rows.slice(0, pLimit);
  $('#projects-grid').innerHTML = shown.length ? shown.map(p => `<button class="glass proj tilt rv${p.featured ? ' star' : ''}" data-id="${esc(p.id)}"><div class="top"><span class="cat">${esc(p.category)}</span><span class="yr">${esc(p.period || p.year)}</span></div><div><div class="client">${esc(p.client)}</div><h3>${esc(p.title)}</h3></div><p>${esc(p.description)}</p><div class="tags">${(p.tech || []).slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></button>`).join('') : '<p class="empty">No projects match your filter.</p>';
  const more = $('#projMore'); more.hidden = rows.length <= pLimit; more.textContent = `Show more projects (${rows.length - pLimit})`;
  tiltAll($('#projects-grid')); reveal($('#projects-grid'));
}
function initProjects(list) {
  projects = [...list].sort((a, b) => (b.year || 0) - (a.year || 0));
  const cats = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];
  const f = $('#projFilters');
  f.innerHTML = cats.map(c => `<button class="f${c === 'All' ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  f.addEventListener('click', e => { const b = e.target.closest('.f'); if (!b) return; $$('.f', f).forEach(x => x.classList.toggle('on', x === b)); pCat = b.dataset.c; pLimit = PAGE; renderProjects(); });
  $('#projSearch').addEventListener('input', e => { pQ = e.target.value.trim(); pLimit = PAGE; renderProjects(); });
  $('#projMore').addEventListener('click', () => { pLimit += PAGE; renderProjects(); });
  $('#projects-grid').addEventListener('click', e => { const b = e.target.closest('.proj'); if (b) openProject(projects.find(p => p.id === b.dataset.id)); });
  renderProjects();
}

/* modal + lightbox */
const lastFocus = { el: null };
function openOverlay(el) { lastFocus.el = document.activeElement; el.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', el).focus(); }
function closeOverlay(el) { el.hidden = true; document.body.style.overflow = ''; lastFocus.el && lastFocus.el.focus && lastFocus.el.focus(); }
function openProject(p) {
  if (!p) return;
  $('#modalBody').innerHTML = `<span class="eyebrow">${esc(p.category)} · ${esc(p.period || p.year)}</span><h2>${esc(p.title)}</h2><div class="client" style="font-weight:600">${esc(p.client)}</div><p class="desc">${esc(p.description)}</p><div class="tags">${(p.tech || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
  openOverlay($('#modal'));
}
function openCert(c) {
  $('#lbImg').src = c.image; $('#lbImg').alt = c.title;
  $('#lbTitle').textContent = c.title;
  $('#lbMeta').textContent = [c.issuer, c.date, c.credentialId && `ID: ${c.credentialId}`].filter(Boolean).join(' · ');
  openOverlay($('#lightbox'));
}
$('#lbClose').onclick = () => closeOverlay($('#lightbox'));
$('#modalClose').onclick = () => closeOverlay($('#modal'));
[$('#lightbox'), $('#modal')].forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlay(o); }));
addEventListener('keydown', e => { if (e.key === 'Escape') [$('#lightbox'), $('#modal')].forEach(o => !o.hidden && closeOverlay(o)); });

/* certificates */
let certs = [], cur = 0, timer;
function layoutCarousel() {
  const items = $$('.car-item'), n = items.length, small = innerWidth < 620;
  items.forEach((el, i) => {
    let d = i - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
    const a = Math.abs(d), vis = a <= 3;
    el.style.transform = `translateX(${d * (small ? 38 : 52)}%) translateZ(${-a * 160}px) rotateY(${d * -38}deg) scale(${1 - a * .05})`;
    el.style.opacity = vis ? 1 - a * .22 : 0; el.style.zIndex = 10 - a; el.style.filter = a ? `brightness(${1 - a * .18})` : 'none';
    el.style.pointerEvents = vis ? 'auto' : 'none'; el.tabIndex = d === 0 ? 0 : -1;
  });
  const c = certs[cur]; if (c) $('#carCaption').innerHTML = `<b>${esc(c.title)}</b><span>${esc(c.issuer)} · ${esc(c.date)}</span>`;
}
const go = d => { cur = (cur + d + certs.length) % certs.length; layoutCarousel(); };
function autoplay() { clearInterval(timer); if (!reduce) timer = setInterval(() => go(1), 4500); }
function initCerts(list) {
  certs = list; if (!certs.length) return;
  $('#carStage').innerHTML = certs.map((c, i) => `<div class="car-item" data-i="${i}" role="button" aria-label="${esc(c.title)}"><img src="${esc(c.image)}" alt="${esc(c.title)}" loading="${i < 4 ? 'eager' : 'lazy'}" draggable="false"></div>`).join('');
  $('#carStage').addEventListener('click', e => { const it = e.target.closest('.car-item'); if (!it) return; const i = +it.dataset.i; i === cur ? openCert(certs[i]) : (cur = i, layoutCarousel()); autoplay(); });
  $('#carPrev').onclick = () => { go(-1); autoplay(); }; $('#carNext').onclick = () => { go(1); autoplay(); };
  const car = $('#carousel'); let sx = null;
  car.addEventListener('pointerdown', e => { sx = e.clientX; });
  car.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) { go(e.clientX < sx ? 1 : -1); autoplay(); } sx = null; });
  car.addEventListener('mouseenter', () => clearInterval(timer)); car.addEventListener('mouseleave', autoplay);
  car.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  addEventListener('resize', layoutCarousel);
  layoutCarousel();
  let seen = false;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { if (!seen) { seen = true; cur = 0; layoutCarousel(); } autoplay(); } else clearInterval(timer);
  }), { threshold: .35 }).observe(car);

  const cats = ['All', ...new Set(certs.map(c => c.category).filter(Boolean))];
  const f = $('#certFilters'), grid = $('#certGrid');
  const draw = cat => {
    grid.innerHTML = certs.map((c, i) => [c, i]).filter(([c]) => cat === 'All' || c.category === cat).map(([c, i]) => `<button class="glass cert tilt rv" data-i="${i}"><div class="thumb"><img src="${esc(c.image)}" alt="" loading="lazy"></div><div class="meta"><h4>${esc(c.title)}</h4><small>${esc(c.issuer)} · ${esc(c.date)}</small></div></button>`).join('');
    tiltAll(grid); reveal(grid);
  };
  f.innerHTML = cats.map(c => `<button class="f${c === 'All' ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  f.addEventListener('click', e => { const b = e.target.closest('.f'); if (!b) return; $$('.f', f).forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.c); });
  grid.addEventListener('click', e => { const b = e.target.closest('.cert'); if (b) openCert(certs[+b.dataset.i]); });
  draw('All');
}

/* typed roles */
function startTyped(roles) {
  const el = $('#typed'); if (!roles.length) return;
  if (reduce) { el.textContent = roles.join(' · '); return; }
  let i = 0, j = 0, del = false;
  (function tick() {
    const w = roles[i];
    el.textContent = w.slice(0, j);
    if (!del && j === w.length) { del = true; return setTimeout(tick, 1600); }
    if (del && j === 0) { del = false; i = (i + 1) % roles.length; }
    j += del ? -1 : 1; setTimeout(tick, del ? 28 : 65);
  })();
}

/* hero 3D parallax */
const scene = $('#heroScene');
if (fine && !reduce) {
  const hero = $('.hero');
  hero.addEventListener('pointermove', e => {
    const r = scene.getBoundingClientRect(), x = (e.clientX - (r.left + r.width / 2)) / innerWidth, y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    scene.style.transform = `rotateY(${x * 26}deg) rotateX(${-y * 22}deg)`;
  });
  hero.addEventListener('pointerleave', () => { scene.style.transform = ''; });
} else if (!reduce && window.DeviceOrientationEvent) {
  scene.style.transition = 'none';
  addEventListener('deviceorientation', e => { if (e.gamma == null) return; scene.style.transform = `rotateY(${Math.max(-1, Math.min(1, e.gamma / 40)) * 14}deg) rotateX(${Math.max(-1, Math.min(1, (e.beta - 50) / 40)) * -12}deg)`; }, { passive: true });
}

/* nav, theme, progress */
const nav = $('#nav'), links = $('#links'), menuBtn = $('#menuBtn');
menuBtn.onclick = () => { const o = links.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); };
links.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); } });
$('#themeBtn').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; try { localStorage.setItem('theme', t); } catch (e) { } };
const sections = $$('main section[id]'), anchors = $$('a', links);
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const h = document.documentElement; $('#progress').style.width = (scrollY / (h.scrollHeight - innerHeight) * 100) + '%';
    let cur = ''; sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id; });
    anchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    ticking = false;
  });
}, { passive: true });
$('#year').textContent = new Date().getFullYear();

/* boot */
Promise.all([load('profile'), load('experience'), load('projects'), load('certifications')])
  .then(([p, e, pr, c]) => { renderProfile(p); renderExperience(e); initProjects(pr); initCerts(c); tiltAll(); reveal(); })
  .catch(err => {
    document.querySelector('main').insertAdjacentHTML('afterbegin', `<div class="container glass" style="margin-top:120px;padding:24px"><h3>Could not load portfolio data</h3><p class="lead">Open this site through a web server (GitHub Pages or <code>python -m http.server</code>), not by double-clicking the file. (${esc(err.message)})</p></div>`);
  });
})();
