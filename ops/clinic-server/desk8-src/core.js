/* Clinic Desk — core: state, routing, helpers, shell. */
(function () {
  'use strict';
  const D = window.CD_DATA;
  const LS = 'clinicdesk_demo_v4';
  const CD = window.CD = { apps: {}, A: {}, R: {} };
  let S = null;
  const UI = CD.UI = { app: 'reception', scr: 'home', prm: {}, f: {}, modal: null, toast: null };

  /* ---------- state ---------- */
  function load() {
    if (CD.liveState) { S = CD.liveState; CD.S = S; return; }
    try { S = JSON.parse(localStorage.getItem(LS)); } catch (e) { S = null; }
    if (!S || S.ver !== 4) { S = D.seedAll(); save(); }
    CD.S = S;
  }
  function save() { if (CD.liveState) return; try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* storage full or blocked: demo keeps working in memory */ } }
  CD.save = save;
  CD.load = () => load();
  CD.meName = () => (S && S.me && S.me.name) || 'Priya';
  CD.reset = function () { S = D.seedAll(); CD.S = S; save(); UI.f = {}; UI.modal = null; go(UI.app, 'home'); toast('Demo reset — fresh fake data for today'); };
  const C = CD.C = () => S.clinics[S.active];

  /* ---------- helpers ---------- */
  const esc = CD.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  CD.rs = n => (n < 0 ? '− ₹' : '₹') + Math.abs(Math.round(n)).toLocaleString('en-IN');
  CD.t = m => { m = Math.round(m); const h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'pm' : 'am'; const h12 = ((h + 11) % 12) + 1; return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap; };
  CD.tShort = m => { const h = Math.floor(m / 60), mm = m % 60; const h12 = ((h + 11) % 12) + 1; return mm ? h12 + ':' + String(mm).padStart(2, '0') + (h >= 12 ? ' pm' : ' am') : h12 + (h >= 12 ? ' pm' : ' am'); };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  CD.d = s => { const d = D.fromIso(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
  CD.day = s => { const d = D.fromIso(s); return DAY[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  CD.rel = s => { const n = Math.round((D.fromIso(S.today) - D.fromIso(s)) / 864e5); if (n === 0) return 'Today'; if (n === 1) return 'Yesterday'; if (n === -1) return 'Tomorrow'; if (n < 0) return 'In ' + (-n) + ' days'; if (n < 14) return n + ' days ago'; if (n < 60) return Math.round(n / 7) + ' weeks ago'; return Math.round(n / 30) + ' months ago'; };
  CD.daysAgo = s => Math.round((D.fromIso(S.today) - D.fromIso(s)) / 864e5);
  CD.addDays = D.addDays; CD.dow = D.dow;
  CD.uhid = p => { if (!p) return ''; const n = String(p.id).replace(/\D/g, ''); const h = n ? Number(n.slice(-6)) : String(p.id).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 99999, 7); return (C().billPrefix || 'CD/').replace('/', '') + '-' + String(h + 10000).padStart(5, '0'); };
  CD.words = function (n) {
    n = Math.round(n); if (n === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '');
    const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
    const parts = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1000); n %= 1000;
    if (cr) parts.push(three(cr) + ' Crore'); if (lk) parts.push(two(lk) + ' Lakh'); if (th) parts.push(two(th) + ' Thousand'); if (n) parts.push(three(n));
    return parts.join(' ');
  };
  CD.mask = ph => ph ? ph.slice(0, 2) + 'xxx ' + ph.slice(5) : '';
  CD.phoneFmt = ph => ph ? ph.slice(0, 5) + ' ' + ph.slice(5) : '';
  CD.age = p => p.ageText || (p.age ? p.age + ' y' : '');
  CD.as = p => [CD.age(p), p.sex].filter(Boolean).join(' ');
  CD.P = id => C().patients.find(p => p.id === id);
  CD.doc = id => C().doctors.find(d => d.id === id) || { id, name: 'Doctor', short: 'Doctor' };
  CD.first = name => (name || '').replace(/^(Mohd\.|Dr\.)\s*/, '').split(' ')[0];
  CD.link = (pid, path) => { const p = CD.P(pid); return 'desk.bas30din.com/' + C().slug + '/' + (p ? CD.first(p.name).toLowerCase() : 'you') + (path ? '/' + path : ''); };
  CD.now = () => S.clock;
  CD.tick = n => { S.clock += (n == null ? 1 : n); };
  CD.uid = pfx => pfx + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

  /* visits / queue */
  CD.todays = () => C().visits.filter(v => v.date === S.today);
  CD.queue = docId => CD.todays().filter(v => (!docId || v.doc === docId) && (v.status === 'waiting' || v.status === 'booked')).sort((a, b) => (a.status === b.status ? tokN(a) - tokN(b) : (a.status === 'waiting' ? -1 : 1)));
  CD.waiting = docId => CD.todays().filter(v => (!docId || v.doc === docId) && v.status === 'waiting').sort((a, b) => tokN(a) - tokN(b));
  CD.inCabin = docId => CD.todays().find(v => v.doc === docId && v.status === 'cabin');
  const tokN = v => parseInt(String(v.tok || 'A-999').split('-')[1], 10);
  CD.tokN = tokN;
  CD.docsNow = () => C().doctors.filter(d => d.status === 'in' || d.status === 'out');
  CD.billOf = v => v.bill ? C().bills.find(b => b.no === v.bill) : null;
  CD.paid = v => !!v.bill;
  CD.lastVisit = (pid, beforeToday) => C().visits.filter(v => v.pid === pid && v.status === 'done' && (!beforeToday || v.date < S.today)).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  CD.visitFee = (pid, kind, trId) => {
    const c = C();
    if (kind === 'proc') { const t = c.treatments.find(x => x.id === trId) || c.treatments.find(x => x.cat === 'procedure'); return t ? t.p : 0; }
    if (kind === 'follow') { const lv = pid ? CD.lastVisit(pid, true) : null; if (lv && CD.daysAgo(lv.date) <= c.freeDays) return 0; return c.fee; }
    return c.fee;
  };
  CD.feeItems = (pid, kind, trId) => {
    const c = C();
    if (kind === 'proc') { const t = c.treatments.find(x => x.id === trId) || c.treatments.find(x => x.cat === 'procedure'); return t ? [{ n: t.n, amt: t.p, cat: t.cat, gst: t.gst }] : []; }
    const fee = CD.visitFee(pid, kind);
    if (!fee) return [];
    return [{ n: kind === 'follow' ? 'Consultation (follow-up)' : 'Consultation', amt: fee, cat: 'consult', gst: 0 }];
  };
  CD.makeBill = (pid, items, mode, extra) => {
    const c = C();
    const total = items.reduce((s, x) => s + x.amt, 0);
    const b = Object.assign({ no: c.billPrefix + (c.billNo++), date: S.today, time: S.clock, pid, items, total, mode, by: CD.meName(), refund: null }, extra || {});
    c.bills.push(b);
    return b;
  };
  CD.netOf = b => b.total - (b.refund ? b.refund.amt : 0);
  CD.nextTok = () => { const c = C(); const n = Math.max(c.tokNext || 1, ...CD.todays().map(tokN).filter(x => x < 900).map(x => x + 1)); c.tokNext = n + 1; return 'A-' + n; };

  /* WhatsApp (simulated) */
  CD.send = (pid, key, vars, kind) => {
    const c = C(); const p = pid ? CD.P(pid) : null;
    const tpl = (c.msgs[c.lang === 'hl' ? 'hl' : 'en'] || {})[key] || '';
    const v = Object.assign({ name: p ? CD.first(p.name) : '', clinic: c.name, link: pid ? CD.link(pid) : '' }, vars || {});
    const text = tpl.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m).replace(/\*/g, '');
    c.inbox.push({ date: S.today, time: S.clock, pid, kind: kind || 'Sent', text, out: true });
    return text;
  };

  /* ---------- routing ---------- */
  function go(app, scr, prm, keepForm) {
    UI.app = app || UI.app; UI.scr = scr || 'home'; UI.prm = prm || {};
    if (!keepForm) UI.f = {};
    UI.modal = null;
    const h = '#' + UI.app + '/' + UI.scr;
    if (location.hash !== h) history.replaceState(null, '', h);
    render(); window.scrollTo(0, 0);
  }
  CD.go = go;
  function fromHash() { const m = (location.hash || '').replace('#', '').split('/'); if (m[0] && CD.apps[m[0]]) { UI.app = m[0]; UI.scr = (m[1] && CD.apps[m[0]].screens[m[1]]) ? m[1] : 'home'; } }

  /* ---------- toast / modal ---------- */
  let toastTimer = null;
  function toast(msg, wa) {
    UI.toast = { msg, wa };
    const old = document.getElementById('toast'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status');
    el.innerHTML = (wa ? '<span class="wa" aria-hidden="true">✓</span>' : '') + '<span>' + esc(msg) + '</span>';
    document.body.appendChild(el);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 3600);
  }
  CD.toast = toast;
  CD.modal = (html, wide) => { UI.modal = { html, wide }; renderModal(); };
  CD.closeModal = () => { UI.modal = null; renderModal(); };
  function renderModal() {
    let m = document.getElementById('modal-root');
    if (!UI.modal) { if (m) m.innerHTML = ''; return; }
    const html = typeof UI.modal.html === 'function' ? UI.modal.html() : UI.modal.html;
    m.innerHTML = '<div class="scrim" data-a="scrim"><div class="modal' + (UI.modal.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    const f = m.querySelector('input,textarea'); if (f) f.focus();
  }
  CD.renderModal = renderModal;

  /* ---------- print + downloads ---------- */
  CD.print = (title, body) => {
    const ifr = document.createElement('iframe'); ifr.style.position = 'fixed'; ifr.style.width = '0'; ifr.style.height = '0'; ifr.style.border = '0';
    document.body.appendChild(ifr);
    const doc = ifr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=IBM+Plex+Sans:wght@400;600;700&family=Newsreader:opsz,wght@6..72,600&display=swap"><style>body{font-family:"IBM Plex Sans",sans-serif;color:#16213A;margin:28px;font-size:14px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #DDD;padding:7px 8px;text-align:left}th{font-size:12px;text-transform:uppercase;color:#555}.r{text-align:right}.serif{font-family:Newsreader,serif}.sig{font-family:Caveat,cursive;font-size:28px}.stamp{display:inline-block;white-space:nowrap;font-weight:700;letter-spacing:2px;text-transform:uppercase;border:2.5px solid currentColor;border-radius:6px;padding:3px 10px;transform:rotate(-5deg);color:#24563A}h1{font-family:Newsreader,serif;margin:0 0 4px}</style></head><body>' + body + '</body></html>');
    doc.close();
    setTimeout(() => { try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) { } setTimeout(() => ifr.remove(), 1500); }, 500);
  };
  CD.csv = (name, rows) => {
    const s = rows.map(r => r.map(x => { x = String(x == null ? '' : x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + s], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Downloaded ' + name + ' — opens in Excel');
  };

  /* ---------- regions (partial refresh while typing) ---------- */
  CD.region = (name, args) => '<div id="rg-' + name + '">' + CD.R[name](args) + '</div>';
  CD.upd = names => String(names).split(',').forEach(n => { const el = document.getElementById('rg-' + n.trim()); if (el && CD.R[n.trim()]) el.innerHTML = CD.R[n.trim()](); });

  /* ---------- shell ---------- */
  const APPS = [['reception', 'Reception'], ['doctor', 'Doctor'], ['owner', 'Owner'], ['patient', 'Patient phone'], ['admin', 'My clinics']];
  function demoBar() {
    if (CD.liveBar) return CD.liveBar();
    const c = C();
    const clinics = Object.values(S.clinics);
    return '<div class="demo no-print" role="navigation" aria-label="Demo controls"><b>DEMO</b><span>fake data</span>' +
      APPS.map(([id, l]) => '<button class="pill' + (UI.app === id ? ' on' : '') + '" data-a="app" data-v="' + id + '">' + l + '</button>').join('') +
      '<span class="sp"></span>' +
      (clinics.length > 1 ? '<select data-ch="clinic" aria-label="Clinic">' + clinics.map(x => '<option value="' + x.id + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<span>' + esc(c.name) + '</span>') +
      '<span>· ' + CD.day(S.today) + ' · <b>' + CD.t(S.clock) + '</b></span>' +
      '<button class="pill" data-a="clock" data-v="15" title="Move the clock forward">+15 min</button>' +
      '<button class="pill" data-a="reset">Reset demo</button></div>';
  }
  CD.header = (role, right) => {
    const c = C();
    return '<header class="hdr" style="--brand:' + c.color + '"><span class="logo" aria-hidden="true">' + esc(c.logo) + '</span><span class="serif nm">' + esc(c.short || c.name) + ' Clinic</span><span class="who">· ' + esc(role) + '</span><span class="sp"></span>' + (right || '') + '</header>';
  };
  CD.backBtn = (to) => '<button class="back" data-a="nav" data-v="' + (to || 'home') + '">← ' + (to && to !== 'home' ? 'Back' : 'Home') + '</button>';
  CD.tile = (scr, icon, title, sub, iconBg, iconFg, subCls) => '<button class="tile" data-a="nav" data-v="' + scr + '"><span class="ic" aria-hidden="true" style="background:' + iconBg + ';color:' + iconFg + '">' + icon + '</span><span class="tt">' + esc(title) + '</span><span class="sb ' + (subCls || '') + '">' + esc(sub) + '</span></button>';
  CD.choices = (field, opts, cur, cls) => '<div class="choices">' + opts.map(o => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<button class="choice ' + (cls || '') + (String(cur) === String(v) ? ' on' : '') + '" data-a="pick" data-k="' + field + '" data-v="' + esc(v) + '">' + esc(l) + '</button>'; }).join('') + '</div>';
  CD.empty = msg => '<div class="card empty">' + esc(msg) + '</div>';

  function render() {
    if (CD.allowApp && !CD.allowApp(UI.app)) { UI.app = CD.homeApp(); UI.scr = 'home'; }
    const app = CD.apps[UI.app];
    const scr = app.screens[UI.scr] || app.screens.home;
    let body;
    try { body = scr(); } catch (e) { console.error(e); body = '<main class="pg"><div class="card pad bad">Something broke on this screen: ' + esc(e.message) + '</div>' + CD.backBtn() + '</main>'; }
    document.getElementById('root').innerHTML = demoBar() + '<div class="app-' + UI.app + '">' + body + '</div>';
    document.body.className = 'app-' + UI.app;
    renderModal();
    document.querySelectorAll('.train').forEach(t => { t.scrollLeft = t.scrollWidth; });
    const af = document.querySelector('[data-autofocus]'); if (af) af.focus();
  }
  CD.render = render;

  /* ---------- events ---------- */
  const A = CD.A;
  A.app = ds => go(ds.v, 'home');
  A.nav = ds => go(UI.app, ds.v, ds.p ? JSON.parse(ds.p) : {});
  A.pick = ds => { UI.f[ds.k] = ds.v; if (ds.then && A[ds.then]) A[ds.then](ds); else render(); };
  A.reset = () => { if (confirmDemo('Start the demo again with fresh fake data? Your changes will be cleared.')) CD.reset(); };
  A.clock = ds => { CD.tick(Number(ds.v)); save(); render(); toast('Clock moved to ' + CD.t(S.clock)); };
  A.scrim = () => CD.closeModal();
  A.close = () => CD.closeModal();
  function confirmDemo(msg) { return window.confirm(msg); }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    if (el.dataset.a === 'scrim' && e.target !== el) return;
    const fn = A[el.dataset.a];
    if (!fn) return;
    e.preventDefault();
    const lp = CD.livePre && CD.livePre(el.dataset.a, el.dataset, el);
    fn(el.dataset, el, e);
    save();
    if (lp) CD.liveAfter(lp);
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f) UI.f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.u) CD.upd(el.dataset.u);
    if (el.dataset.ai && A[el.dataset.ai]) { const lp = CD.livePre && CD.livePre(el.dataset.ai, el.dataset, el); A[el.dataset.ai](el.dataset, el, e); save(); if (lp) CD.liveAfter(lp); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.ch === 'clinic') { S.active = el.value; save(); go(UI.app, 'home'); return; }
    if (el.type === 'checkbox' && el.dataset.f) UI.f[el.dataset.f] = el.checked;
    if (el.dataset.ac && A[el.dataset.ac]) { const lp = CD.livePre && CD.livePre(el.dataset.ac, el.dataset, el); A[el.dataset.ac](el.dataset, el, e); save(); if (lp) CD.liveAfter(lp); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && UI.modal) { CD.closeModal(); return; }
    const el = e.target;
    if (e.key === 'Enter' && el.dataset && el.dataset.enter && A[el.dataset.enter]) { e.preventDefault(); const lp = CD.livePre && CD.livePre(el.dataset.enter, el.dataset, el); A[el.dataset.enter](el.dataset, el, e); save(); if (lp) CD.liveAfter(lp); return; }
    if (UI.app === 'reception' && !UI.modal) {
      if (e.key === 'F2') { e.preventDefault(); go('reception', 'home'); setTimeout(() => { const s = document.getElementById('home-search'); if (s) s.focus(); }, 0); }
      if (e.key === 'F3') { e.preventDefault(); go('reception', 'newp'); }
    }
  });
  window.addEventListener('hashchange', () => { const a = UI.app, s = UI.scr; fromHash(); if (a !== UI.app || s !== UI.scr) { UI.f = {}; render(); } });

  CD.start = () => { load(); fromHash(); render(); };
})();
