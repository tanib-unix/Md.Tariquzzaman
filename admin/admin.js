(() => {
'use strict';
const $ = s => document.querySelector(s);
const h = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, ''); else if (v !== false && v != null) el.setAttribute(k, v);
  }
  kids.flat().forEach(c => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
  return el;
};
const KEY = 'portfolio-admin-v1';

/* ---------- field converters (stored value <-> textarea text) ---------- */
const lines = { to: v => (v || []).join('\n'), from: s => s.split('\n').map(x => x.trim()).filter(Boolean) };
const paras = { to: v => (v || []).join('\n\n'), from: s => s.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean) };
const tags = { to: v => (v || []).join(', '), from: s => s.split(',').map(x => x.trim()).filter(Boolean) };
const table = (keys, num = []) => ({
  to: v => (v || []).map(o => keys.map(k => o[k] ?? '').join(' | ')).join('\n'),
  from: s => s.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const p = l.split('|').map(x => x.trim()); const o = {}; keys.forEach((k, i) => { o[k] = num.includes(k) ? (+p[i] || 0) : (p[i] || ''); }); return o; })
});
const skillsConv = {
  to: v => (v || []).map(g => `${g.group} | ${(g.items || []).join(', ')}`).join('\n'),
  from: s => s.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf('|'); return { group: (i < 0 ? l : l.slice(0, i)).trim(), items: i < 0 ? [] : l.slice(i + 1).split(',').map(x => x.trim()).filter(Boolean) }; })
};

/* ---------- schemas ---------- */
const SCHEMA = {
  profile: { label: 'Profile', file: 'profile', single: true, fields: [
    ['name', 'Full name', 'text'], ['title', 'Professional title', 'text'], ['tagline', 'Hero tagline', 'textarea'],
    ['roles', 'Typing animation phrases (one per line)', 'area', lines],
    ['location', 'Location', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'], ['linkedin', 'LinkedIn URL', 'text'],
    ['photo', 'Profile photo', 'image'], ['cv', 'CV file path', 'text', null, 'e.g. assets/Md-Tariquzzaman-CV.pdf. Upload a new PDF in the Files tab.'],
    ['summary', 'About paragraphs (separate with a blank line)', 'area', paras, null, 10],
    ['stats', 'Headline numbers. Format: value | suffix | label', 'area', table(['value', 'suffix', 'label'], ['value']), 'Example: 15 | + | Years of experience'],
    ['skills', 'Skill groups. Format: Group | item, item, item', 'area', skillsConv, null, 8],
    ['awards', 'Awards. Format: title | period | description', 'area', table(['title', 'period', 'text']), null, 5],
    ['education', 'Education. Format: degree | school | period', 'area', table(['degree', 'school', 'period'])],
    ['languages', 'Languages (one per line)', 'area', lines], ['training', 'Training & courses (one per line)', 'area', lines, null, 8]
  ] },
  experience: { label: 'Experience', file: 'experience', title: o => o.role || 'New role', sub: o => o.company, blank: () => ({ company: '', location: '', period: '', role: '', note: '', bullets: [] }), fields: [
    ['role', 'Role / position', 'text'], ['company', 'Company', 'text'], ['location', 'Location', 'text'], ['period', 'Period', 'text'], ['note', 'Note (e.g. previous positions)', 'text'],
    ['bullets', 'Responsibilities (one per line)', 'area', lines, null, 7]
  ] },
  projects: { label: 'Projects', file: 'projects', search: true, title: o => `${o.client || ''} · ${o.title || 'New project'}`, sub: o => o.period, blank: () => ({ id: '', client: '', title: '', period: '', year: new Date().getFullYear(), category: 'Exadata', tech: [], description: '', featured: false }), fields: [
    ['client', 'Client', 'text'], ['title', 'Project title', 'text'], ['period', 'Period (display text)', 'text'], ['year', 'Year (used for sorting)', 'number'],
    ['category', 'Category', 'text', null, 'Used for filter chips. Reuse names like Exadata, ODA, SPARC & LDOM, Storage, Private Cloud, x86 & Servers.'],
    ['tech', 'Technologies (comma separated)', 'text', tags], ['description', 'Description', 'textarea', null, null, 4], ['featured', 'Featured project', 'check']
  ] },
  certifications: { label: 'Certifications', file: 'certifications', search: true, title: o => o.title || 'New certificate', sub: o => o.date, blank: () => ({ title: '', issuer: '', date: '', image: '', category: 'Oracle', credentialId: '' }), fields: [
    ['title', 'Certificate title', 'text'], ['issuer', 'Issuer', 'text'], ['date', 'Date', 'text'], ['category', 'Category', 'text'],
    ['credentialId', 'Credential ID (optional)', 'text'], ['image', 'Certificate image', 'image']
  ] },
  files: { label: 'Files' },
  settings: { label: 'Connection' }
};

/* ---------- state ---------- */
let cfg = {}, data = {}, dirty = new Set(), pending = new Map(), tab = 'profile', filter = '';
try { cfg = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { } };

/* ---------- GitHub API ---------- */
const path = p => (cfg.dir ? cfg.dir.replace(/^\/|\/$/g, '') + '/' : '') + p;
const api = (p, opt = {}) => fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path(p))}${opt.q || ''}`, {
  ...opt, headers: { Authorization: `Bearer ${cfg.token}`, Accept: opt.accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.headers || {}) }
});
const b64 = s => btoa(unescape(encodeURIComponent(s)));
async function getText(p) {
  const r = await api(p, { q: `?ref=${encodeURIComponent(cfg.branch)}`, accept: 'application/vnd.github.raw+json' });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${r.status === 404 ? 'not found (check owner, repo, branch, folder)' : r.status === 401 ? 'bad token' : r.statusText}`);
  return r.text();
}
async function put(p, contentB64, msg) {
  let sha;
  const g = await api(p, { q: `?ref=${encodeURIComponent(cfg.branch)}` });
  if (g.ok) sha = (await g.json()).sha;
  const r = await api(p, { method: 'PUT', body: JSON.stringify({ message: msg, content: contentB64, branch: cfg.branch, ...(sha ? { sha } : {}) }) });
  if (!r.ok) throw new Error(`${p}: ${r.status} ${(await r.json().catch(() => ({}))).message || ''}`);
}

/* ---------- ui helpers ---------- */
function toast(msg, kind = '') { const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + kind; clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3800); }
function setDirty(name) {
  dirty.add(name); $('#saveBtn').disabled = false;
  $('#status').textContent = `Unsaved changes (${dirty.size} file${dirty.size > 1 ? 's' : ''})`; $('#status').className = 'status dirty';
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function shrink(file, max = 1800) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WebP image');
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', .85); return { url, b64: url.split(',')[1] };
}

function imageField(obj, key, name) {
  const img = h('img', { alt: '', src: obj[key] ? (pending.get(obj[key])?.url || '../' + obj[key]) : '' });
  const txt = h('input', { value: obj[key] || '', placeholder: 'assets/uploads/...', oninput: e => { obj[key] = e.target.value.trim(); img.src = obj[key] ? '../' + obj[key] : ''; setDirty(name); } });
  const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', onchange: async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const r = await shrink(f); const p = `assets/uploads/${Date.now()}-${slug(f.name.replace(/\.[^.]+$/, ''))}.jpg`; pending.set(p, r); obj[key] = p; txt.value = p; img.src = r.url; setDirty(name); toast('Image ready. It uploads when you publish.', 'good'); }
    catch (err) { toast(err.message, 'bad'); }
  } });
  return h('div', { class: 'img-field' }, img, h('div', { style: 'flex:1;min-width:200px;display:grid;gap:8px' }, txt, file));
}

function fieldEl(obj, f, name) {
  const [key, label, type, conv, help, rows] = f;
  let input;
  if (type === 'image') input = imageField(obj, key, name);
  else if (type === 'check') { input = h('input', { type: 'checkbox', style: 'width:auto', onchange: e => { obj[key] = e.target.checked; setDirty(name); } }); input.checked = !!obj[key]; }
  else if (type === 'textarea' || type === 'area') {
    input = h('textarea', { rows: rows || 3, oninput: e => { obj[key] = conv ? conv.from(e.target.value) : e.target.value; setDirty(name); } });
    input.value = conv ? conv.to(obj[key]) : (obj[key] ?? '');
  } else {
    input = h('input', { type: type === 'number' ? 'number' : 'text', oninput: e => { obj[key] = conv ? conv.from(e.target.value) : type === 'number' ? +e.target.value : e.target.value; setDirty(name); } });
    input.value = conv ? conv.to(obj[key]) : (obj[key] ?? '');
  }
  const w = h('label', { class: 'field' }, label, input);
  if (help) w.append(h('small', {}, help));
  return w;
}

/* ---------- panels ---------- */
function renderTabs() {
  const t = $('#tabs'); t.replaceChildren(...Object.entries(SCHEMA).map(([k, s]) => h('button', { class: 'tab' + (k === tab ? ' on' : ''), onclick: () => { tab = k; filter = ''; renderTabs(); renderPanel(); } }, s.label)));
}
function renderPanel() {
  const p = $('#panel'), s = SCHEMA[tab]; p.replaceChildren();
  if (tab === 'settings') return p.append(settingsPanel());
  if (tab === 'files') return p.append(filesPanel());
  if (s.single) { const c = h('div', { class: 'card' }, h('h2', {}, s.label), s.fields.map(f => fieldEl(data[tab], f, tab))); return p.append(c); }
  const list = data[tab], open = new Set();
  const wrap = h('div');
  const draw = () => {
    wrap.replaceChildren();
    list.forEach((o, i) => {
      const text = JSON.stringify(o).toLowerCase(); if (filter && !text.includes(filter)) return;
      const body = h('div', { class: 'item-body', hidden: !open.has(o) }, s.fields.map(f => fieldEl(o, f, tab)),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn ghost sm', disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; setDirty(tab); draw(); } }, 'Move up'),
          h('button', { class: 'btn ghost sm', disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; setDirty(tab); draw(); } }, 'Move down'),
          h('button', { class: 'btn danger sm', onclick: () => { if (confirm('Delete this entry?')) { list.splice(i, 1); setDirty(tab); draw(); } } }, 'Delete')));
      const head = h('div', { class: 'item-head', onclick: () => { open.has(o) ? open.delete(o) : open.add(o); body.hidden = !body.hidden; } }, h('b', {}, s.title(o)), h('small', {}, s.sub(o) || ''), h('span', { 'aria-hidden': 'true' }, '▾'));
      wrap.append(h('div', { class: 'item' }, head, body));
    });
  };
  const bar = h('div', { class: 'bar' },
    h('h2', { style: 'margin:0' }, `${s.label} (${list.length})`),
    s.search ? h('input', { type: 'search', placeholder: 'Filter...', oninput: e => { filter = e.target.value.toLowerCase(); draw(); } }) : null,
    h('button', { class: 'btn', onclick: () => { const o = s.blank(); list.unshift(o); open.add(o); filter = ''; setDirty(tab); draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, '+ Add new'));
  p.append(bar, wrap); draw();
}
function filesPanel() {
  const out = h('p', { class: 'help' });
  const file = h('input', { type: 'file', accept: '.pdf,image/*' });
  const btn = h('button', { class: 'btn', onclick: async () => {
    const f = file.files[0]; if (!f) return toast('Choose a file first', 'bad');
    if (f.size > 8e6) return toast('Max 8 MB', 'bad');
    btn.disabled = true;
    try {
      const buf = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      const p = `assets/uploads/${slug(f.name.replace(/\.[^.]+$/, ''))}${f.name.match(/\.[^.]+$/)?.[0].toLowerCase() || ''}`;
      await put(p, btoa(s), `admin: upload ${p}`); out.textContent = `Uploaded. Use this path: ${p}`; toast('Uploaded', 'good');
    } catch (e) { toast(e.message, 'bad'); } btn.disabled = false;
  } }, 'Upload to repository');
  return h('div', { class: 'card' }, h('h2', {}, 'Upload a file'), h('p', { class: 'help' }, 'Upload a CV (PDF) or any image straight into assets/uploads. Then paste the shown path into the matching field (for example the CV path in Profile).'), file, h('div', { style: 'margin-top:12px' }, btn), out);
}
function settingsPanel() {
  const row = (k, l) => h('label', { class: 'field' }, l, h('input', { value: cfg[k] || '', oninput: e => { cfg[k] = e.target.value.trim(); save(); } }));
  return h('div', { class: 'card' }, h('h2', {}, 'GitHub connection'), row('owner', 'Owner'), row('repo', 'Repository'), row('branch', 'Branch'), row('dir', 'Site folder'),
    h('p', { class: 'help' }, 'Changes apply on the next load or publish. Use Sign out to remove the saved token from this browser.'));
}

/* ---------- boot / publish ---------- */
async function loadAll() {
  for (const n of ['profile', 'experience', 'projects', 'certifications']) data[n] = JSON.parse(await getText(`data/${n}.json`));
}
async function connect() {
  cfg = { owner: $('#cOwner').value.trim(), repo: $('#cRepo').value.trim(), branch: $('#cBranch').value.trim() || 'main', dir: $('#cDir').value.trim(), token: $('#cToken').value.trim() };
  const err = $('#loginErr'); err.textContent = '';
  if (!cfg.owner || !cfg.repo || !cfg.token) return err.textContent = 'Owner, repository and token are required.';
  $('#connectBtn').disabled = true;
  try { await loadAll(); save(); start(); } catch (e) { err.textContent = e.message; }
  $('#connectBtn').disabled = false;
}
function start() {
  $('#login').hidden = true; $('#app').hidden = false; $('#logoutBtn').hidden = false;
  $('#status').textContent = `Connected: ${cfg.owner}/${cfg.repo}@${cfg.branch}`; $('#status').className = 'status ok';
  renderTabs(); renderPanel();
}
async function publish() {
  const btn = $('#saveBtn'); btn.disabled = true; $('#status').textContent = 'Publishing...';
  try {
    for (const name of ['projects']) (data[name] || []).forEach(p => { if (!p.id) p.id = slug(`${p.client} ${p.title}`) || 'p-' + Date.now(); });
    const json = JSON.stringify(data);
    for (const [p, r] of pending) { if (json.includes(p)) await put(p, r.b64, `admin: add image ${p}`); pending.delete(p); }
    for (const name of dirty) await put(`data/${name}.json`, b64(JSON.stringify(data[name], null, 2) + '\n'), `admin: update ${name}`);
    dirty.clear(); $('#status').textContent = 'Published. GitHub Pages updates in about a minute.'; $('#status').className = 'status ok'; toast('Published successfully', 'good');
  } catch (e) { btn.disabled = false; $('#status').textContent = 'Publish failed'; toast(e.message, 'bad'); }
}
$('#connectBtn').onclick = connect;
$('#saveBtn').onclick = publish;
$('#logoutBtn').onclick = () => { if (dirty.size && !confirm('Discard unsaved changes?')) return; delete cfg.token; save(); location.reload(); };
addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });

// prefill: remembered config, else guess from github.io URL
const m = location.hostname.match(/^([^.]+)\.github\.io$/);
const guess = { owner: m?.[1] || '', repo: m ? (location.pathname.split('/')[1] || m[1] + '.github.io') : '', branch: 'main', dir: '' };
const c0 = { ...guess, ...cfg };
$('#cOwner').value = c0.owner || ''; $('#cRepo').value = c0.repo || ''; $('#cBranch').value = c0.branch || 'main'; $('#cDir').value = c0.dir || '';
if (cfg.token && cfg.owner && cfg.repo) { $('#cToken').value = cfg.token; connect(); }
})();
