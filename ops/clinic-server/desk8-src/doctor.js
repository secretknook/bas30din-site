/* Clinic Desk — Doctor app (every screen working) */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, R = CD.R, UI = CD.UI;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();
  const KIND = { new: 'New', follow: 'Follow-up', proc: 'Procedure' };

  const me = () => { const c = C(); const id = S().docId && c.doctors.some(d => d.id === S().docId) ? S().docId : (c.doctors[0] || {}).id; return CD.doc(id); };
  const noSun = d => CD.dow(d) === 0 ? CD.addDays(d, 1) : d;
  const pron = p => p && p.sex === 'M' ? 'him' : 'her';

  function hdr() {
    const c = C(); const d = me();
    const sel = c.doctors.length > 1 ? '<select class="field" style="height:40px;width:auto;font-size:15px" data-ac="whoAmI" aria-label="Which doctor">' + c.doctors.map(x => '<option value="' + x.id + '"' + (x.id === d.id ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' : '<span class="muted">' + esc(d.name) + '</span>';
    return CD.header(d.name, sel + '<span class="muted">' + CD.t(S().clock) + '</span>' + (!CD.allowApp || CD.allowApp('owner') ? '<button class="sw-link" data-a="app" data-v="owner">Switch to Owner</button>' : ''));
  }
  A.whoAmI = (ds, el) => { S().docId = el.value; CD.go('doctor', 'home'); };

  const SC = {};
  CD.apps.doctor = { screens: SC };

  /* follow-ups due */
  function followDue(docId) {
    const c = C(), s = S();
    const latest = {};
    c.rx.forEach(r => { if (!latest[r.pid] || latest[r.pid].date < r.date) latest[r.pid] = r; });
    const lastV = {}; c.visits.forEach(v => { if (v.status !== 'left' && (!lastV[v.pid] || lastV[v.pid] < v.date)) lastV[v.pid] = v.date; });
    const future = new Set(c.appts.filter(a => a.date >= s.today).map(a => a.pid));
    return Object.values(latest).filter(r => r.doc === docId && r.follow && r.follow <= CD.addDays(s.today, 7) && !(lastV[r.pid] > r.date) && !future.has(r.pid))
      .map(r => ({ r, p: CD.P(r.pid), late: CD.daysAgo(r.follow) }))
      .filter(x => x.p && !x.p.merged)
      .sort((a, b) => b.late - a.late);
  }

  /* ================= HOME ================= */
  SC.home = function () {
    const c = C(), s = S(), d = me();
    const cab = CD.inCabin(d.id); const wait = CD.waiting(d.id);
    const nextV = cab || wait[0];
    const p = nextV && CD.P(nextV.pid);
    const fu = followDue(d.id); const late = fu.filter(x => x.late > 30).length;
    const myPids = new Set(c.visits.filter(v => v.doc === d.id).map(v => v.pid));
    const reps = c.reports.filter(r => !r.seen && myPids.has(r.pid));
    const seen = CD.todays().filter(v => v.doc === d.id && v.status === 'done');
    const timed = seen.filter(v => v.started && v.ended);
    const avg = timed.length ? Math.round(timed.reduce((x, v) => x + (v.ended - v.started), 0) / timed.length) : 7;
    const leaves = c.leaves.filter(l => l.doc === d.id && l.date >= s.today).sort((a, b) => a.date < b.date ? -1 : 1);
    let outBox = '';
    if (d.status === 'out' && d.out) {
      const over = s.clock >= d.out.until;
      outBox = '<div class="banner"><span class="grow"><strong>' + (over ? 'Your break time is over — are you back?' : 'You stepped out · back by ' + CD.t(d.out.until)) + '</strong><br><span class="small">' + d.out.told + ' waiting patients were told. New bookings moved.</span></span><button class="btn" data-a="imBack">I\'m back</button><button class="ghost" data-a="outMore">15 more minutes</button></div>';
    } else if (d.status !== 'in') {
      outBox = '<div class="banner"><span class="grow"><strong>You are marked "' + (d.status === 'gone' ? 'gone for the day' : 'not in yet') + '".</strong> Patients see this on the queue page.</span><button class="btn" data-a="imIn">I\'m in the cabin</button></div>';
    }
    const card = nextV ? '<section class="card soft" style="display:flex;flex-wrap:wrap;align-items:center;gap:24px;padding:28px 30px" aria-label="Next patient"><div style="flex:1 1 520px"><div class="muted small">' + (cab ? 'With you now' : 'Next patient') + ' · ' + esc(nextV.tok) + (cab ? '' : ' · waiting ' + Math.max(1, s.clock - nextV.time) + ' min') + '</div><div class="serif" style="font-size:40px;font-weight:600;line-height:1.15">' + esc(p.name) + '</div><div style="color:#3A4458">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + esc(KIND[nextV.kind]) + (p.problem ? ' · ' + esc(p.problem) : '') + (CD.lastVisit(p.id, true) ? ' · last came ' + CD.rel(CD.lastVisit(p.id, true).date).toLowerCase() : ' · first visit') + '</div></div><div style="display:flex;flex-direction:column;gap:10px"><button class="btn big" data-a="startConsult"' + (d.status === 'in' ? '' : ' disabled') + '>' + (cab ? 'Continue consult' : 'Start consult') + '</button>' + (d.status === 'in' ? '<button class="ghost" data-a="nav" data-v="out">Step out for a while</button>' : '') + '</div></section>'
      : '<section class="card soft pad flex wrap"><span class="grow" style="font-size:20px">No one is waiting for you right now.</span>' + (d.status === 'in' ? '<button class="ghost" data-a="nav" data-v="out">Step out for a while</button>' : '') + '</section>';
    const tiles = [
      CD.tile('today', String(wait.length), 'Waiting for you', wait.length ? 'Next: ' + wait.slice(0, 2).map(v => CD.first(CD.P(v.pid).name)).join(', then ') : 'No one waiting', 'var(--a)', '#FFFFFF'),
      CD.tile('follow', String(fu.length), 'Follow-ups due', late ? late + ' are late by over a month' : (fu.length ? 'All recent' : 'None due'), '#F3E6CC', '#6B4300', late ? 'warn' : ''),
      CD.tile('reports', String(reps.length), 'New reports', reps.length ? CD.first(CD.P(reps[0].pid).name) + ' sent ' + reps[0].name.toLowerCase() : 'Nothing new', reps.length ? '#F6E1DF' : '#E8EFE9', reps.length ? '#8E2A22' : '#24563A', reps.length ? 'bad' : '')
    ];
    if (c.boxes.d_sets) tiles.push(CD.tile('sets', 'Rx', 'My Rx sets', c.sets.length + ' ready sets', 'var(--at)', 'var(--a)'));
    tiles.push(CD.tile('leave', '◷', 'Timings and leave', leaves.length ? 'Next leave: ' + CD.day(leaves[0].date) : 'Next leave: none', 'var(--at)', 'var(--a)'));
    tiles.push('<button class="tile" data-a="walkIn"><span class="ic" aria-hidden="true" style="background:var(--at);color:var(--a)">✎</span><span class="tt">Write a prescription</span><span class="sb">For a walk-in or phone patient</span></button>');
    return hdr() + '<main class="pg">' + outBox + card + '<div class="tiles">' + tiles.join('') + '</div>' +
      '<div class="flex wrap" style="justify-content:center;gap:10px"><span class="muted">More:</span>' + [['search', 'Search patients'], ['photos', 'Before / after photos'], ['earn', 'My earnings'], ['letter', 'Letterhead']].map(([k, l]) => '<button class="link" data-a="nav" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<p class="muted" style="margin:0;text-align:center;font-size:16px">Today: ' + seen.length + ' seen · ' + wait.length + ' waiting · average ' + avg + ' min per patient</p></main>';
  };
  A.startConsult = function (ds) {
    const d = me();
    let v = ds && ds.tok ? CD.todays().find(x => x.tok === ds.tok) : (CD.inCabin(d.id) || CD.waiting(d.id)[0]);
    if (!v) { CD.toast('No one is waiting'); return; }
    const cab = CD.inCabin(d.id);
    if (cab && cab !== v) { cab.status = 'waiting'; }
    if (v.status !== 'cabin') { v.status = 'cabin'; v.started = S().clock; CD.send(v.pid, 'turn', { token: v.tok }, 'Your turn'); }
    CD.go('doctor', 'consult', { tok: v.tok });
  };
  A.imBack = () => { const d = me(); d.status = 'in'; d.out = null; CD.toast('Welcome back · patients can see you\'re in'); CD.render(); };
  A.imIn = () => { const d = me(); d.status = 'in'; d.out = null; CD.render(); };
  A.outMore = () => { const d = me(); d.out.until = Math.max(d.out.until, S().clock) + 15; CD.waiting(d.id).forEach(v => CD.send(v.pid, 'out', { doctor: d.short, reason: d.out.reason.toLowerCase(), until: CD.t(d.out.until) }, 'Doctor late')); CD.toast('Patients told: back by ' + CD.t(d.out.until), true); CD.render(); };
  A.walkIn = () => { UI.f.wq = ''; CD.modal('<h2 class="t">Prescription for…</h2><input class="field" data-f="wq" data-u="wres" placeholder="Search name or phone" autocomplete="off">' + CD.region('wres') + '<div class="right"><button class="txt" data-a="close">Cancel</button></div>'); };
  R.wres = () => { const q = (UI.f.wq || '').toLowerCase(); if (q.length < 2) return '<div class="muted small">Type at least 2 letters.</div>'; const dig = q.replace(/\D/g, ''); return C().patients.filter(p => !p.merged && (p.name.toLowerCase().includes(q) || (dig.length > 2 && p.phone.includes(dig)))).slice(0, 6).map(p => '<button class="card" style="width:100%;text-align:left;padding:12px 16px;margin-top:8px" data-a="walkPick" data-id="' + p.id + '"><strong>' + esc(p.name) + '</strong> <span class="muted small">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + CD.mask(p.phone) + '</span></button>').join('') || '<div class="muted small">No one found. Ask reception to register them.</div>'; };
  A.walkPick = ds => CD.go('doctor', 'consult', { pid: ds.id });

  /* ================= CONSULT ================= */
  SC.consult = function () {
    const c = C(), s = S(), d = me();
    const v = UI.prm.tok ? CD.todays().find(x => x.tok === UI.prm.tok) : null;
    const pid = v ? v.pid : UI.prm.pid;
    const p = CD.P(pid);
    if (!p) return hdr() + '<main class="pg">' + CD.backBtn() + CD.empty('Patient not found') + '</main>';
    const past = c.rx.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    const f = UI.f;
    if (f.init !== 1) { f.init = 1; f.finding = ''; f.meds = []; f.advice = ''; f.follow = '28'; f.set = ''; f.wt = p.wt || ''; f.bp = ''; f.tests = ''; }
    const reps = c.reports.filter(r => r.pid === p.id);
    const aside = '<aside style="flex:1 1 320px;display:flex;flex-direction:column;gap:14px"><div><div class="serif" style="font-size:34px;font-weight:600;line-height:1.15">' + esc(p.name) + '</div><div class="muted">' + esc(CD.as(p)) + (v ? ' · ' + esc(v.tok) + ' · ' + esc(KIND[v.kind]) : ' · walk-in / phone') + '</div></div>' +
      (p.words ? '<div class="card soft pad"><div class="muted small">In ' + (p.sex === 'M' ? 'his' : 'her') + ' words, on WhatsApp</div><div style="font-size:18px">"' + esc(p.words) + '"</div></div>' : '') +
      '<div class="card pad"><div class="muted small">Good to know</div><div>Allergies: ' + esc(p.allergies || 'None told') + '</div></div>' +
      (past.length ? '<div class="card pad"><div class="muted small" style="margin-bottom:6px">Before</div>' + past.slice(0, 3).map(r => '<div style="padding:6px 0;border-top:1px solid #EEE7DA"><strong>' + CD.d(r.date) + '</strong> · ' + esc(r.finding) + '<br><span class="muted small">' + esc(r.meds.map(m => m.n).join(', ')) + '</span></div>').join('') + '<button class="txt" data-a="repeatRx" data-id="' + past[0].id + '">Repeat last prescription</button></div>' : '<div class="card pad muted">First visit — no history.</div>') +
      (reps.length ? '<div class="card pad"><div class="muted small">Reports</div>' + reps.map(r => '<button class="txt" style="display:block" data-a="seeReport" data-id="' + r.id + '">' + esc(r.name) + ' · ' + CD.d(r.date) + (r.seen ? '' : ' · new') + '</button>').join('') + '</div>' : '') + '</aside>';
    const main = '<section class="card" style="flex:2 1 560px;padding:26px 28px;display:flex;flex-direction:column;gap:18px">' +
      '<div><span class="flbl">What you found</span><input class="field" data-f="finding" value="' + esc(f.finding) + '" placeholder="e.g. Acne vulgaris, grade 2 — cheeks and jaw" data-autofocus></div>' +
      '<div class="grid3" style="grid-template-columns:1fr 1fr 2fr"><div><span class="flbl">Weight (kg)</span><input class="field" inputmode="decimal" data-f="wt" value="' + esc(f.wt) + '"></div><div><span class="flbl">BP</span><input class="field" data-f="bp" value="' + esc(f.bp) + '" placeholder="120/80"></div><div><span class="flbl">Tests advised (comma between)</span><input class="field" data-f="tests" value="' + esc(f.tests) + '" placeholder="e.g. CBC, Thyroid profile"></div></div>' +
      '<div><span class="flbl">Medicines — tap a ready set, then change anything</span><div class="choices" style="margin-bottom:12px">' + c.sets.slice().sort((a, b) => b.used - a.used).slice(0, 8).map(st => '<button class="choice sm' + (f.set === st.id ? ' on' : '') + '" data-a="useSet" data-id="' + st.id + '">' + esc(st.n) + '</button>').join('') + '</div>' + CD.region('meds') + '</div>' +
      '<div><span class="flbl">Advice</span><input class="field" data-f="advice" value="' + esc(f.advice) + '" placeholder="e.g. Wash face twice a day. Don\'t squeeze. Sunscreen in the day."></div>' +
      '<div><span class="flbl">See ' + pron(p) + ' again</span>' + CD.choices('follow', [['14', '2 weeks'], ['28', '4 weeks'], ['42', '6 weeks'], ['0', 'Only if needed']], f.follow) + '</div>' +
      '<div class="flex wrap" style="padding-top:6px"><span class="sig grow" style="white-space:nowrap">' + esc(d.name) + '</span><button class="ghost" data-a="printRx">Print</button><button class="ghost" data-a="saveAsSet">Save as a set</button><button class="btn big" data-a="finishRx">Finish and send Rx on WhatsApp</button></div><div id="rx-err" class="bad small"></div></section>';
    return hdr() + '<main class="pg">' + CD.backBtn() + '<div class="flex wrap" style="align-items:flex-start;gap:24px">' + aside + main + '</div></main>';
  };
  R.meds = function () {
    const meds = UI.f.meds || [];
    return (meds.length ? meds.map((m, i) => '<div class="flex" style="padding:8px 0;border-bottom:1px solid #EEE7DA;gap:10px"><input class="field" style="flex:1.2;height:48px;font-size:17px;font-weight:600" value="' + esc(m.n) + '" data-ai="medSet" data-i="' + i + '" data-k="n" placeholder="Medicine" aria-label="Medicine name"><input class="field" style="flex:1;height:48px;font-size:16px" value="' + esc(m.how) + '" data-ai="medSet" data-i="' + i + '" data-k="how" placeholder="How to take" aria-label="How to take"><button class="txt" style="text-decoration:none;color:#8E2A22;font-size:20px" aria-label="Remove" data-a="medRm" data-i="' + i + '">✕</button></div>').join('') : '<div class="muted small">No medicines yet.</div>') + '<button class="txt" data-a="medAdd">+ Add medicine</button>';
  };
  A.medSet = (ds, el) => { UI.f.meds[Number(ds.i)][ds.k] = el.value; };
  A.medRm = ds => { UI.f.meds.splice(Number(ds.i), 1); CD.upd('meds'); };
  A.medAdd = () => { UI.f.meds.push({ n: '', how: '' }); CD.upd('meds'); const ins = document.querySelectorAll('#rg-meds input[data-k=n]'); if (ins.length) ins[ins.length - 1].focus(); };
  A.useSet = ds => { const st = C().sets.find(x => x.id === ds.id); UI.f.set = st.id; UI.f.meds = st.meds.map(m => Object.assign({}, m)); if (!UI.f.finding) UI.f.finding = st.n.replace(' · ', ', '); syncText(); CD.render(); };
  A.repeatRx = ds => { const r = C().rx.find(x => x.id === ds.id); UI.f.meds = r.meds.map(m => Object.assign({}, m)); UI.f.finding = UI.f.finding || r.finding; UI.f.advice = UI.f.advice || r.advice; syncText(); CD.render(); };
  function syncText() { document.querySelectorAll('[data-f]').forEach(el => { if (el.dataset.f && el.type !== 'checkbox') UI.f[el.dataset.f] = el.value; }); }
  const rxPrintHtml = (p, r, d) => { const c = C(); return '<div style="max-width:640px"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #1E5B46;padding-bottom:10px"><div><h1>' + esc(c.name) + '</h1><div style="color:#555">' + esc(c.timings) + '</div></div><div style="text-align:right"><strong>' + esc(d.name) + '</strong><br><span style="color:#555">' + esc(d.deg || 'MBBS, MD (Dermatology)') + '<br>Reg. no. ' + esc(d.reg || 'DMC/R/48213') + '</span></div></div><p><strong>' + esc(p.name) + '</strong> · ' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + CD.d(r.date) + '</p><p><strong>Diagnosis:</strong> ' + esc(r.finding) + '</p><p style="font-size:22px;font-family:Newsreader,serif;margin:12px 0 4px">Rx</p><table>' + r.meds.map((m, i) => '<tr><td>' + (i + 1) + '.</td><td><strong>' + esc(m.n) + '</strong></td><td>' + esc(m.how) + '</td></tr>').join('') + '</table>' + (r.advice ? '<p><strong>Advice:</strong> ' + esc(r.advice) + '</p>' : '') + (r.follow ? '<p><strong>Next visit:</strong> ' + CD.day(r.follow) + '</p>' : '') + '<div style="text-align:right;margin-top:30px"><span class="sig" style="color:#1E5B46">' + esc(d.name) + '</span></div></div>'; };
  CD.rxPrintHtml = rxPrintHtml;
  function currentRx(p) { const f = UI.f; return { pid: p.id, date: S().today, doc: me().id, finding: (f.finding || '').trim(), meds: (f.meds || []).filter(m => m.n.trim()), advice: (f.advice || '').trim(), vitals: { wt: (f.wt || '').trim(), bp: (f.bp || '').trim() }, tests: (f.tests || '').split(',').map(x => x.trim()).filter(Boolean), follow: f.follow && f.follow !== '0' ? noSun(CD.addDays(S().today, Number(f.follow))) : null }; }
  const curP = () => { const v = UI.prm.tok ? CD.todays().find(x => x.tok === UI.prm.tok) : null; return CD.P(v ? v.pid : UI.prm.pid); };
  A.printRx = () => { syncText(); const p = curP(); CD.print('Prescription ' + p.name, CD.rxPrintHtml(p, currentRx(p), me())); };
  A.saveAsSet = () => { syncText(); const meds = (UI.f.meds || []).filter(m => m.n.trim()); if (!meds.length) { CD.toast('Add medicines first'); return; } const n = window.prompt('Name for this set', UI.f.finding || 'My set'); if (!n) return; C().sets.push({ id: CD.uid('s'), n: n.trim(), meds: meds.map(m => Object.assign({}, m)), used: 0 }); CD.toast('Saved as "' + n.trim() + '"'); CD.render(); };
  A.finishRx = function () {
    syncText();
    const c = C(), s = S(), p = curP();
    const r = currentRx(p);
    if (!r.finding) { document.getElementById('rx-err').textContent = 'Write what you found first.'; return; }
    if (!r.meds.length && !window.confirm('No medicines added. Finish anyway (advice only)?')) return;
    r.id = CD.uid('rx'); c.rx.push(r);
    if (UI.f.set) { const st = c.sets.find(x => x.id === UI.f.set); if (st) st.used++; }
    if (r.vitals.wt) p.wt = r.vitals.wt; p.problem = p.problem || r.finding.toLowerCase().split(/[,—-]/)[0].trim();
    let v = UI.prm.tok ? CD.todays().find(x => x.tok === UI.prm.tok) : null;
    if (v) { v.status = 'done'; v.ended = s.clock; }
    else c.visits.push({ date: s.today, time: s.clock, pid: p.id, doc: me().id, kind: 'follow', status: 'done', tok: 'Rx' });
    CD.send(p.id, 'rx', { doctor: me().name, link: CD.link(p.id, 'rx') }, 'Prescription');
    CD.tick(5);
    const nx = CD.waiting(me().id)[0];
    CD.go('doctor', 'home');
    CD.toast('Rx sent to ' + CD.first(p.name) + ' on WhatsApp' + (nx ? ' · next: ' + CD.first(CD.P(nx.pid).name) : ''), true);
  };

  /* ================= WAITING ================= */
  SC.today = function () {
    const d = me(); const cab = CD.inCabin(d.id); const wait = CD.waiting(d.id);
    const seen = CD.todays().filter(v => v.doc === d.id && v.status === 'done').sort((a, b) => (b.ended || b.time) - (a.ended || a.time));
    const row = (v, label) => { const p = CD.P(v.pid); return '<div class="card list-card"><span class="tok">' + esc(v.tok) + '</span><div class="grow"><div class="nm2">' + esc(p.name) + '</div><div class="muted" style="font-size:16px">' + esc(KIND[v.kind]) + (p.problem ? ' · ' + esc(p.problem) : '') + (CD.as(p) ? ' · ' + esc(CD.as(p)) : '') + '</div></div>' + (label ? '<span class="badge b-ink">' + label + '</span>' : '') + '<button class="ghost" data-a="startConsult" data-tok="' + v.tok + '">Open</button></div>'; };
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Waiting for you · ' + wait.length + '</h1>' +
      '<section class="card" style="padding:22px 26px 26px"><div class="muted small" style="margin-bottom:14px">Your queue</div>' + CD.trainHtml(d.id) + '</section>' +
      (cab ? row(cab, 'With you') : '') + (wait.length ? wait.map(v => row(v)).join('') : CD.empty('No one waiting.')) +
      (seen.length ? '<div class="muted" style="margin-top:6px">Seen today · ' + seen.length + '</div><div class="card" style="padding:4px 24px">' + seen.map(v => { const p = CD.P(v.pid); return '<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" data-a="docP" data-id="' + p.id + '"><span class="tok" style="font-size:17px;color:#9AA1AE">' + esc(v.tok) + '</span><span class="grow">' + esc(p.name) + '</span><span class="muted small">' + esc(KIND[v.kind]) + '</span></button>'; }).join('') + '</div>' : '') + '</main>';
  };
  A.docP = ds => CD.go('doctor', 'patient', { id: ds.id });

  /* ================= FOLLOW-UPS ================= */
  SC.follow = function () {
    const d = me(); const fu = followDue(d.id); const all = UI.f.all === '1';
    const list = all ? fu : fu.slice(0, 12);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Follow-ups due · ' + fu.length + '</h1><p class="muted" style="margin:0">The bot already reminded them on WhatsApp. These have not booked yet.</p>' +
      (list.length ? list.map(x => { const st = x.late > 30 ? ['Late ' + Math.round(x.late / 7) + ' weeks', 'bad'] : x.late > 0 ? ['Late ' + x.late + ' days', 'warn'] : x.late === 0 ? ['Due today', 'warn'] : ['Due in ' + (-x.late) + ' days', '']; const asked = x.p.asked === S().today; return '<div class="card list-card"><button class="grow" style="text-align:left;background:none;border:0;padding:0" data-a="docP" data-id="' + x.p.id + '"><div class="nm2">' + esc(x.p.name) + '</div><div class="muted" style="font-size:16px">' + esc(x.r.finding) + ' · last came ' + CD.d(x.r.date) + '</div></button><span class="' + st[1] + '" style="font-weight:600;width:130px;text-align:right">' + st[0] + '</span>' + (asked ? '<span class="badge b-ok">Reception will call</span>' : '<button class="ghost sm" data-a="askCall" data-id="' + x.p.id + '">Ask reception to call</button><button class="ghost sm" data-a="remindNow" data-id="' + x.p.id + '">Remind on WhatsApp</button>') + '</div>'; }).join('') : CD.empty('No follow-ups due. Everyone is on track.')) +
      (fu.length > 12 ? '<button class="txt" data-a="pick" data-k="all" data-v="' + (all ? '0' : '1') + '">' + (all ? 'Show fewer' : 'Show all ' + fu.length) + '</button>' : '') + '</main>';
  };
  A.askCall = ds => { const p = CD.P(ds.id); const c = C(); c.calls.push({ id: CD.uid('c'), pid: p.id, name: p.name, phone: p.phone, why: me().short + ' asked: follow-up is due', when: S().clock, how: 'from doctor', done: false }); p.asked = S().today; CD.toast('Added to reception\'s calls'); CD.render(); };
  A.remindNow = ds => { const p = CD.P(ds.id); CD.send(p.id, 'reminder', { doctor: me().name, link: CD.link(p.id, 'book') }, 'Reminder'); p.asked = S().today; CD.toast('Reminder sent to ' + CD.first(p.name), true); CD.render(); };

  /* ================= REPORTS ================= */
  SC.reports = function () {
    const c = C(); const d = me();
    const myPids = new Set(c.visits.filter(v => v.doc === d.id).map(v => v.pid));
    const reps = c.reports.filter(r => myPids.has(r.pid)).sort((a, b) => (a.seen === b.seen ? (a.date < b.date ? 1 : -1) : (a.seen ? 1 : -1)));
    const nNew = reps.filter(r => !r.seen).length;
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Reports · ' + nNew + ' new</h1>' +
      (reps.length ? reps.map(r => { const p = CD.P(r.pid); return '<div class="card list-card"' + (r.seen ? ' style="background:#FBF8F2"' : '') + '><div class="grow"><div class="nm2">' + esc(p.name) + (r.seen ? '' : ' <span class="badge b-bad">New</span>') + '</div><div class="muted" style="font-size:16px">' + esc(r.name) + ' · sent on WhatsApp ' + CD.rel(r.date).toLowerCase() + '</div></div><button class="btn" data-a="seeReport" data-id="' + r.id + '">See report</button></div>'; }).join('') : CD.empty('No reports yet.')) + '</main>';
  };
  A.seeReport = ds => {
    const r = C().reports.find(x => x.id === ds.id); const p = CD.P(r.pid);
    CD.modal('<h2 class="t">' + esc(r.name) + '</h2><div class="muted">' + esc(p.name) + ' · ' + CD.d(r.date) + '</div><div class="card" style="padding:4px 20px">' + r.values.map(v => '<div class="row"><span class="grow">' + esc(v[0]) + '</span><strong>' + esc(v[1]) + '</strong><span class="' + (/high|low/i.test(v[2]) ? 'bad' : 'ok') + ' small" style="width:190px;text-align:right">' + esc(v[2]) + '</span></div>').join('') + '</div><div class="muted small">Reply on WhatsApp</div><div class="flex wrap"><button class="ghost sm" data-a="repReply" data-id="' + r.id + '" data-v="Report seen. All fine — continue your medicines.">All fine, continue</button><button class="ghost sm" data-a="repReply" data-id="' + r.id + '" data-v="Report seen. Please come for a visit this week — reply 1 to book.">Please come for a visit</button><button class="btn sm" data-a="repSeen" data-id="' + r.id + '">Mark seen</button></div>', true);
  };
  A.repSeen = ds => { const r = C().reports.find(x => x.id === ds.id); r.seen = true; CD.closeModal(); CD.render(); };
  A.repReply = ds => { const r = C().reports.find(x => x.id === ds.id); r.seen = true; C().inbox.push({ date: S().today, time: S().clock, pid: r.pid, kind: 'Report reply', text: me().short + ': ' + ds.v, out: true }); CD.closeModal(); CD.toast('Sent to ' + CD.first(CD.P(r.pid).name) + ' on WhatsApp', true); CD.render(); };

  /* ================= RX SETS ================= */
  SC.sets = function () {
    const c = C();
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<div class="flex wrap" style="align-items:flex-end"><h1 class="t grow">My Rx sets</h1><button class="btn" data-a="editSet" data-id="">+ New set</button></div><p class="muted" style="margin:0">One tap fills the medicines in a consult. You can still change them.</p><div class="grid2">' +
      c.sets.slice().sort((a, b) => b.used - a.used).map(st => '<button class="card pad" style="text-align:left" data-a="editSet" data-id="' + st.id + '"><div style="font-size:20px;font-weight:600">' + esc(st.n) + '</div><div class="muted" style="font-size:16px">' + st.meds.length + ' medicines · used ' + st.used + ' times</div><div class="small" style="margin-top:6px;color:#3A4458">' + esc(st.meds.map(m => m.n).join(' · ')) + '</div></button>').join('') + '</div></main>';
  };
  A.editSet = ds => {
    const st = ds.id ? C().sets.find(x => x.id === ds.id) : { id: '', n: '', meds: [{ n: '', how: '' }] };
    UI.f.es = { id: st.id, n: st.n, meds: st.meds.map(m => Object.assign({}, m)) };
    CD.modal(setForm, true);
  };
  function setForm() {
    const es = UI.f.es;
    return '<h2 class="t">' + (es.id ? 'Edit set' : 'New set') + '</h2><div><span class="flbl">Name</span><input class="field" value="' + esc(es.n) + '" data-ai="esName" placeholder="e.g. Acne · grade 2"></div>' +
      es.meds.map((m, i) => '<div class="flex" style="gap:10px"><input class="field" style="flex:1.2;height:48px" value="' + esc(m.n) + '" data-ai="esMed" data-i="' + i + '" data-k="n" placeholder="Generic name + strength"><input class="field" style="flex:.7;height:48px" value="' + esc(m.brand || '') + '" data-ai="esMed" data-i="' + i + '" data-k="brand" placeholder="Brand (optional)"><input class="field" style="flex:1;height:48px" value="' + esc(m.how) + '" data-ai="esMed" data-i="' + i + '" data-k="how" placeholder="How to take"><button class="txt" style="color:#8E2A22;text-decoration:none" data-a="esRm" data-i="' + i + '" aria-label="Remove">✕</button></div>').join('') +
      '<button class="txt" data-a="esAdd">+ Add medicine</button><div class="flex"><button class="btn" data-a="esSave">Save set</button>' + (es.id ? '<button class="ghost" style="color:#8E2A22;border-color:#E8B9B4" data-a="esDel">Delete</button>' : '') + '<button class="txt" data-a="close">Cancel</button></div>';
  }
  A.esName = (ds, el) => { UI.f.es.n = el.value; };
  A.esMed = (ds, el) => { UI.f.es.meds[Number(ds.i)][ds.k] = el.value; };
  A.esAdd = () => { UI.f.es.meds.push({ n: '', how: '' }); CD.renderModal(); };
  A.esRm = ds => { UI.f.es.meds.splice(Number(ds.i), 1); CD.renderModal(); };
  A.esSave = () => { const es = UI.f.es; const c = C(); if (!es.n.trim()) { CD.toast('Give the set a name'); return; } const meds = es.meds.filter(m => m.n.trim()); if (es.id) { const st = c.sets.find(x => x.id === es.id); st.n = es.n.trim(); st.meds = meds; } else c.sets.push({ id: CD.uid('s'), n: es.n.trim(), meds, used: 0 }); CD.closeModal(); CD.toast('Set saved'); CD.render(); };
  A.esDel = () => { const c = C(); c.sets = c.sets.filter(x => x.id !== UI.f.es.id); CD.closeModal(); CD.render(); };

  /* ================= TIMINGS + LEAVE ================= */
  SC.leave = function () {
    const c = C(), s = S(), d = me();
    const dates = []; let x = CD.addDays(s.today, 1); while (dates.length < 6) { if (CD.dow(x) !== 0) dates.push(x); x = CD.addDays(x, 1); }
    const pickD = UI.f.ld || dates[0];
    const booked = c.appts.filter(a => a.doc === d.id && a.date === pickD);
    const my = c.leaves.filter(l => l.doc === d.id && l.date >= s.today).sort((a, b) => a.date < b.date ? -1 : 1);
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Timings and leave</h1>' +
      '<div class="card pad"><div class="muted small">Your timings</div><div class="flex wrap"><span style="font-size:19px" class="grow">' + esc(d.days) + ' · ' + CD.tShort(d.from) + ' – ' + CD.tShort(d.to) + '</span><button class="ghost sm" data-a="editTimings">Change</button></div></div>' +
      (my.length ? '<div class="card" style="padding:4px 24px">' + my.map(l => '<div class="row"><span class="grow"><strong>On leave ' + CD.day(l.date) + '</strong> · ' + l.moved + ' patients told</span><button class="txt" data-a="cancelLeave" data-v="' + l.date + '">Cancel leave</button></div>').join('') + '</div>' : '') +
      '<div><span class="flbl">Take a leave</span><div class="choices">' + dates.map(dt => '<button class="choice' + (pickD === dt ? ' on' : '') + '" data-a="pick" data-k="ld" data-v="' + dt + '">' + (dt === CD.addDays(s.today, 1) ? 'Tomorrow' : CD.day(dt)) + '</button>').join('') + '</div></div>' +
      '<div class="card soft pad">' + (booked.length ? booked.length + ' patient' + (booked.length > 1 ? 's are' : ' is') + ' booked on ' + CD.day(pickD) + '. We will message them on WhatsApp and offer the next day.' : 'No one is booked with you on ' + CD.day(pickD) + '.') + '</div>' +
      '<button class="btn big" data-a="markLeave" data-v="' + pickD + '"' + (c.leaves.some(l => l.doc === d.id && l.date === pickD) ? ' disabled' : '') + '>Mark leave' + (booked.length ? ' and inform ' + booked.length + ' patient' + (booked.length > 1 ? 's' : '') : '') + '</button></main>';
  };
  A.markLeave = ds => {
    const c = C(), d = me(); const booked = c.appts.filter(a => a.doc === d.id && a.date === ds.v);
    booked.forEach(a => CD.send(a.pid, 'leave', { doctor: d.name, day: CD.day(ds.v), link: CD.link(a.pid, 'book') }, 'Leave'));
    let nd = CD.addDays(ds.v, 1); if (CD.dow(nd) === 0) nd = CD.addDays(nd, 1);
    booked.forEach(a => { a.date = nd; a.src += ' · moved from ' + CD.d(ds.v); });
    c.leaves.push({ doc: d.id, date: ds.v, moved: booked.length });
    CD.toast('Leave marked · ' + booked.length + ' patients told and moved to ' + CD.day(nd), true); CD.render();
  };
  A.cancelLeave = ds => { const c = C(); c.leaves = c.leaves.filter(l => !(l.doc === me().id && l.date === ds.v)); CD.toast('Leave cancelled'); CD.render(); };
  A.editTimings = () => { const d = me(); const opts = []; for (let t = 480; t <= 1260; t += 30) opts.push(t); const sel = (k, v) => '<select class="field" data-ai="tmSet" data-k="' + k + '">' + opts.map(t => '<option value="' + t + '"' + (t === v ? ' selected' : '') + '>' + CD.tShort(t) + '</option>').join('') + '</select>'; UI.f.tm = { from: d.from, to: d.to }; CD.modal('<h2 class="t">Your timings</h2><div class="grid2"><div><span class="flbl">From</span>' + sel('from', d.from) + '</div><div><span class="flbl">To</span>' + sel('to', d.to) + '</div></div><div class="flex"><button class="btn" data-a="tmSave">Save</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.tmSet = (ds, el) => { UI.f.tm[ds.k] = Number(el.value); };
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.ai === 'tmSet') A.tmSet(e.target.dataset, e.target); });
  A.tmSave = () => { const d = me(); if (UI.f.tm.to <= UI.f.tm.from) { CD.toast('End time must be after start'); return; } d.from = UI.f.tm.from; d.to = UI.f.tm.to; CD.closeModal(); CD.toast('Timings saved · the bot now offers these times'); CD.render(); };

  /* ================= STEP OUT ================= */
  SC.out = function () {
    const d = me(), f = UI.f;
    if (f.init !== 1) { f.init = 1; f.mins = '30'; f.why = 'Emergency call'; }
    const until = S().clock + Number(f.mins);
    const n = CD.waiting(d.id).length;
    const msg = (C().msgs[C().lang === 'hl' ? 'hl' : 'en'].out || '').replace('{doctor}', d.short).replace('{reason}', f.why === "Don't say" ? 'a short break' : f.why.toLowerCase()).replace('{until}', CD.t(until)).replace(/\*/g, '');
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Step out for a while</h1>' +
      '<div><span class="flbl">How long?</span>' + CD.choices('mins', [['15', '15 min'], ['30', '30 min'], ['60', '1 hour'], ['90', 'Emergency · not sure']], f.mins) + '</div>' +
      '<div><span class="flbl">Reason patients will see</span>' + CD.choices('why', ['Emergency call', 'Ward round', 'Lunch', "Don't say"], f.why) + '</div>' +
      '<div class="card soft pad"><div class="muted small">The ' + n + ' waiting patient' + (n === 1 ? '' : 's') + ' get this on WhatsApp</div><div style="font-size:18px;margin-top:6px">"' + esc(msg) + '"</div></div>' +
      '<div class="card pad" style="color:#3A4458">Reception sees a banner, the patient train shows "Back ' + CD.tShort(until) + '", and when time is up we ask you: back, or 15 more minutes?</div>' +
      '<button class="btn big" data-a="stepOut">Step out and tell ' + n + ' patient' + (n === 1 ? '' : 's') + '</button></main>';
  };
  A.stepOut = () => {
    const d = me(), f = UI.f; const until = S().clock + Number(f.mins); const reason = f.why === "Don't say" ? 'Short break' : f.why;
    const cab = CD.inCabin(d.id); if (cab) cab.status = 'waiting';
    const wait = CD.waiting(d.id);
    d.status = 'out'; d.out = { until, reason, told: wait.length, at: S().clock };
    wait.forEach(v => CD.send(v.pid, 'out', { doctor: d.short, reason: reason.toLowerCase(), until: CD.t(until) }, 'Doctor out'));
    C().appts.filter(a => a.doc === d.id && a.date === S().today && a.time >= S().clock && a.time < until).forEach(a => { a.time = until + (a.time - S().clock); a.src += ' · moved (doctor out)'; });
    CD.go('doctor', 'home');
    CD.toast(wait.length + ' patients told: back by ' + CD.t(until), true);
  };

  /* ================= MORE ================= */
  SC.search = function () {
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Search your patients</h1><input class="field" data-f="sq" data-u="sres" value="' + esc(UI.f.sq || 'melasma') + '" placeholder="A problem (melasma, acne) or a name" data-autofocus>' + CD.region('sres') + '</main>';
  };
  R.sres = function () {
    const c = C(); const q = (UI.f.sq == null ? 'melasma' : UI.f.sq).toLowerCase().trim(); if (q.length < 2) return '';
    const byP = {}; c.rx.forEach(r => { if (r.finding.toLowerCase().includes(q)) (byP[r.pid] = byP[r.pid] || []).push(r); });
    c.patients.forEach(p => { if (!p.merged && (p.name.toLowerCase().includes(q) || (p.problem || '').toLowerCase().includes(q)) && !byP[p.id]) byP[p.id] = []; });
    const rows = Object.keys(byP).map(pid => ({ p: CD.P(pid), n: c.visits.filter(v => v.pid === pid && v.status === 'done').length })).filter(x => x.p && !x.p.merged);
    const better = rows.filter(x => /better/i.test(x.p.outcome)).length;
    return '<div class="card pad"><div style="font-size:22px;font-weight:600">"' + esc(q) + '" · ' + rows.length + ' patients · ' + better + ' got better</div><div class="muted small">From your prescriptions and the patient\'s own updates on WhatsApp.</div></div><div class="card" style="padding:4px 24px">' +
      (rows.length ? rows.slice(0, 30).map(x => { const o = x.p.outcome || 'New'; const cls = /much|better/i.test(o) ? 'ok' : /lost/i.test(o) ? 'bad' : 'warn'; return '<button class="row" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left" data-a="docP" data-id="' + x.p.id + '"><span class="grow" style="font-size:18px">' + esc(x.p.name) + '</span><span class="muted">' + x.n + ' visits</span><span class="' + cls + '" style="width:130px;text-align:right;font-weight:600">' + esc(o === 'Lost' ? 'Did not return' : o) + '</span></button>'; }).join('') : '<div class="empty">No one found.</div>') + '</div>';
  };
  SC.patient = function () {
    const c = C(); const p = CD.P(UI.prm.id); if (!p) return hdr() + CD.empty('Not found');
    const rx = c.rx.filter(r => r.pid === p.id).sort((a, b) => a.date < b.date ? 1 : -1);
    const vs = c.visits.filter(v => v.pid === p.id && v.status === 'done').length;
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<div class="flex wrap" style="align-items:flex-end"><div class="grow"><h1 class="t">' + esc(p.name) + '</h1><div class="muted">' + (CD.as(p) ? esc(CD.as(p)) + ' · ' : '') + vs + ' visits · patient since ' + CD.d(p.since) + ' · ' + esc(p.outcome || '') + '</div></div><button class="btn" data-a="walkPick" data-id="' + p.id + '">Write prescription</button></div>' +
      (p.words ? '<div class="card soft pad">"' + esc(p.words) + '"</div>' : '') +
      (rx.length ? rx.map(r => '<div class="card pad"><div class="flex"><strong class="grow">' + CD.day(r.date) + ' · ' + esc(r.finding) + '</strong><span class="muted small">' + esc(CD.doc(r.doc).short) + '</span><button class="txt" data-a="printOldRx" data-id="' + r.id + '">Print</button></div><div style="margin-top:6px">' + r.meds.map(m => '<div class="small">• <strong>' + esc(m.n) + '</strong> — ' + esc(m.how) + '</div>').join('') + '</div>' + (r.advice ? '<div class="muted small" style="margin-top:4px">Advice: ' + esc(r.advice) + '</div>' : '') + '</div>').join('') : CD.empty('No prescriptions yet.')) + '</main>';
  };
  A.printOldRx = ds => { const r = C().rx.find(x => x.id === ds.id); CD.print('Prescription', CD.rxPrintHtml(CD.P(r.pid), r, CD.doc(r.doc))); };

  SC.photos = function () {
    const c = C(); const d = me();
    const pids = c.rx.filter(r => r.doc === d.id).slice(-60).map(r => r.pid).filter((x, i, a) => a.indexOf(x) === i).slice(0, 4);
    const named = c.named && c.named.riya ? [c.named.riya, c.named.sunita].filter(Boolean) : [];
    const list = named.concat(pids.filter(x => !named.includes(x))).slice(0, 4);
    const ph = (lbl, date, tone) => '<div style="flex:1"><div style="height:160px;border-radius:12px;background:radial-gradient(circle at 40% 40%,' + tone + ',#B98A6A 70%);display:flex;align-items:flex-end;padding:10px"><span class="badge" style="background:rgba(255,255,255,.85)">' + lbl + '</span></div><div class="muted small" style="margin-top:4px">' + date + '</div></div>';
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Before / after photos</h1><p class="muted" style="margin:0">Patients send photos on WhatsApp; they land here side by side. (Demo shows placeholders.)</p><div class="grid2">' +
      list.map(pid => { const p = CD.P(pid); const r = c.rx.filter(x => x.pid === pid).sort((a, b) => a.date < b.date ? -1 : 1); return '<div class="card pad"><div class="nm2" style="font-size:19px">' + esc(p.name) + '</div><div class="muted small" style="margin-bottom:10px">' + esc(r.length ? r[r.length - 1].finding : p.problem) + '</div><div class="flex">' + ph('Before', CD.d(r.length ? r[0].date : p.since), '#D9A88A') + ph('After', CD.d(S().today), '#EBC3A6') + '</div></div>'; }).join('') + '</div></main>';
  };
  SC.earn = function () {
    const c = C(), s = S(), d = me();
    const month = s.today.slice(0, 7);
    const visitDoc = {}; c.visits.forEach(v => { visitDoc[v.pid + v.date] = v.doc; });
    const mine = c.bills.filter(b => b.date.slice(0, 7) === month && visitDoc[b.pid + b.date] === d.id);
    const gross = mine.reduce((x, b) => x + CD.netOf(b), 0);
    const weeks = [0, 0, 0, 0, 0]; mine.forEach(b => { weeks[Math.min(4, Math.floor((Number(b.date.slice(8)) - 1) / 7))] += CD.netOf(b); });
    const mx = Math.max(1, ...weeks);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">My earnings · this month</h1><div class="grid3"><div class="card pad"><div class="muted">Your share (' + Math.round(d.share * 100) + '%)</div><div style="font-size:34px;font-weight:700">' + rs(gross * d.share) + '</div></div><div class="card pad"><div class="muted">Billed for your patients</div><div style="font-size:34px;font-weight:700">' + rs(gross) + '</div></div><div class="card pad"><div class="muted">Bills</div><div style="font-size:34px;font-weight:700">' + mine.length + '</div></div></div>' +
      '<div class="card pad"><div class="muted small">By week</div><div class="vbars">' + weeks.map((w, i) => '<div class="col"><span class="small">' + rs(w * d.share) + '</span><i style="height:' + Math.round(w / mx * 110) + 'px"></i><span class="muted small">Week ' + (i + 1) + '</span></div>').join('') + '</div></div></main>';
  };
  SC.letter = function () {
    const d = me(); const c = C();
    const sample = { pid: '', date: S().today, finding: 'Acne vulgaris, grade 2', meds: (c.sets[0] || { meds: [] }).meds, advice: 'Wash face twice a day.', follow: CD.addDays(S().today, 28) };
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Letterhead and signature</h1><div class="grid2"><div><span class="flbl">Degrees</span><input class="field" value="' + esc(d.deg || 'MBBS, MD (Dermatology)') + '" data-ai="docField" data-k="deg"></div><div><span class="flbl">Registration no.</span><input class="field" value="' + esc(d.reg || 'DMC/R/48213') + '" data-ai="docField" data-k="reg"></div></div><div class="muted small">This is how your prescription looks on WhatsApp and paper:</div><div class="paper" id="lh">' + CD.rxPrintHtml({ name: 'Sample Patient', age: 28, sex: 'F' }, sample, d) + '</div></main>';
  };
  A.docField = (ds, el) => { me()[ds.k] = el.value; };
})();
