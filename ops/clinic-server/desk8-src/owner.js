/* Clinic Desk — Owner app (every screen working) */
(function () {
  'use strict';
  const CD = window.CD, A = CD.A, R = CD.R, UI = CD.UI;
  const esc = CD.esc, rs = CD.rs;
  const S = () => CD.S, C = () => CD.C();

  function hdr() { return CD.header('Owner', '<span class="muted">' + CD.day(S().today) + ' · ' + CD.t(S().clock) + '</span>' + (!CD.allowApp || CD.allowApp('doctor') ? '<button class="sw-link" data-a="app" data-v="doctor">Switch to Doctor</button>' : '')); }
  const SC = {};
  CD.apps.owner = { screens: SC };

  const net = bills => bills.reduce((s, b) => s + CD.netOf(b), 0);
  const billsBetween = (from, to) => C().bills.filter(b => b.date >= from && b.date <= to);
  const monthStart = d => d.slice(0, 8) + '01';
  const prevMonth = d => { const dt = CD.addDays(monthStart(d), -1); return [monthStart(dt), dt]; };
  const sw = (on, act, k) => '<button class="sw' + (on ? '' : ' off') + '" role="switch" aria-checked="' + !!on + '" data-a="' + act + '" data-k="' + k + '"></button>';

  /* ================= HOME ================= */
  SC.home = function () {
    const c = C(), s = S();
    const today = net(billsBetween(s.today, s.today));
    const lastWk = net(billsBetween(CD.addDays(s.today, -7), CD.addDays(s.today, -7)));
    const diff = today - lastWk;
    const tv = CD.todays();
    const seen = tv.filter(v => v.status === 'done').length, waiting = tv.filter(v => v.status === 'waiting').length;
    const fromWa = tv.filter(v => { const p = CD.P(v.pid); return p && /WhatsApp|Missed/.test(p.source); }).length;
    const alerts = [];
    c.cashDays.filter(x => x.diff !== 0 && !x.checked).forEach(x => alerts.push('cash ' + (x.diff < 0 ? 'short ' : 'extra ') + rs(Math.abs(x.diff)) + ' ' + (CD.daysAgo(x.date) <= 1 ? CD.rel(x.date).toLowerCase() : 'on ' + CD.d(x.date))));
    const refundsToday = c.bills.filter(b => b.refund && b.refund.date === s.today).length;
    const changesToday = c.log.filter(l => l.date === s.today).length;
    const ms = monthStart(s.today); const [pms, pme] = prevMonth(s.today);
    const newThis = c.patients.filter(p => !p.merged && p.since >= ms).length;
    const newPrev = c.patients.filter(p => !p.merged && p.since >= pms && p.since <= pme && Number(p.since.slice(8)) <= Number(s.today.slice(8))).length;
    const refDue = c.refs.filter(r => !r.paid).reduce((x, r) => x + r.amt, 0);
    const tiles = [
      CD.tile('money', '₹', 'Money', 'Cash, UPI, card — today and month', 'var(--a)', '#FFFFFF'),
      CD.tile('cash', alerts.length ? '!' : '✓', 'Cash check', alerts.length ? alerts[0][0].toUpperCase() + alerts[0].slice(1) : (s.dayClosed[c.id] ? 'Today closed and matched' : 'All matched'), alerts.length ? '#F6E1DF' : '#E8EFE9', alerts.length ? '#8E2A22' : '#24563A', alerts.length ? 'bad' : 'ok'),
      CD.tile('staff', 'P', 'Staff', changesToday ? changesToday + ' bill change' + (changesToday > 1 ? 's' : '') + ' today' + (refundsToday ? ' (' + refundsToday + ' refund)' : '') : 'No bill changes today', 'var(--at)', 'var(--ad)'),
      CD.tile('growth', '↗', 'Patients', newThis + ' new this month · ' + (newThis >= newPrev ? 'up ' : 'down ') + Math.abs(newThis - newPrev), 'var(--at)', 'var(--ad)'),
      CD.tile('refs', '⇄', 'Referrals', refDue ? rs(refDue) + ' to pay this month' : 'All paid', '#F3E6CC', '#6B4300', refDue ? 'warn' : 'ok'),
      CD.tile('reports', '▤', 'Reports', 'For your CA, in Excel or PDF', 'var(--at)', 'var(--ad)')
    ];
    return hdr() + '<main class="pg"><section class="card soft" style="display:flex;flex-wrap:wrap;align-items:center;gap:28px;padding:28px 32px"><div style="flex:1 1 380px"><div class="muted small">Earned today so far</div><div class="big-num" style="font-size:60px">' + rs(today) + '</div><div style="color:#3A4458">' + (lastWk ? rs(Math.abs(diff)) + (diff >= 0 ? ' more' : ' less') + ' than last ' + CD.day(s.today).split(' ')[0] : 'Nothing billed last week this day') + '</div></div>' +
      '<div style="flex:1 1 300px;display:flex;flex-direction:column;gap:6px;color:#3A4458"><div>' + seen + ' patients seen · ' + waiting + ' waiting</div><div>' + fromWa + ' came from WhatsApp or missed calls</div>' + (alerts.length ? '<div class="bad" style="font-weight:600">' + alerts.length + ' thing' + (alerts.length > 1 ? 's need' : ' needs') + ' you: ' + esc(alerts[0]) + '</div>' : '<div class="ok" style="font-weight:600">Nothing needs you right now</div>') + '</div></section>' +
      '<div class="tiles">' + tiles.join('') + '</div><div style="text-align:center"><button class="ghost" data-a="nav" data-v="settings">⚙ Clinic settings — your name, look, doctors, fees</button></div></main>';
  };

  /* ================= MONEY ================= */
  SC.money = function () {
    const s = S(), c = C(); const per = UI.f.per || 'today';
    const from = per === 'today' ? s.today : per === 'week' ? CD.addDays(s.today, -6) : monthStart(s.today);
    const bills = billsBetween(from, s.today);
    const mode = m => net(bills.filter(b => b.mode === m));
    const cat = k => bills.reduce((x, b) => x + b.items.filter(i => i.cat === k).reduce((y, i) => y + i.amt, 0) - (k === 'consult' && b.discount ? b.discount : 0), 0);
    const refunds = bills.reduce((x, b) => x + (b.refund ? b.refund.amt : 0), 0);
    const visitDoc = {}; c.visits.forEach(v => { visitDoc[v.pid + v.date] = v.doc; });
    const byDoc = c.doctors.map(d => [d.short, net(bills.filter(b => visitDoc[b.pid + b.date] === d.id))]);
    const days = {}; bills.forEach(b => { days[b.date] = (days[b.date] || 0) + CD.netOf(b); });
    const dk = Object.keys(days).sort(); const mx = Math.max(1, ...Object.values(days));
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Money · ' + rs(net(bills)) + '</h1>' + CD.choices('per', [['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month']], per) +
      '<div class="grid3">' + [['Cash', mode('Cash')], ['UPI', mode('UPI')], ['Card', mode('Card')]].map(([k, v]) => '<div class="card pad"><div class="muted">' + k + '</div><div style="font-size:30px;font-weight:700">' + rs(v) + '</div></div>').join('') + '</div>' +
      '<div class="card" style="padding:4px 26px">' + [['Consultations', cat('consult'), bills.filter(b => b.items.some(i => i.cat === 'consult')).length + ' bills'], ['Procedures', cat('procedure'), bills.filter(b => b.items.some(i => i.cat === 'procedure')).length + ' bills'], ['Medicines', cat('medicine'), bills.filter(b => b.items.some(i => i.cat === 'medicine')).length + ' bills'], ['Refunds', -refunds, bills.filter(b => b.refund).length + '']].map(([k, v, n]) => '<div class="row"><span class="grow" style="font-size:18px">' + k + '</span><span class="muted">' + n + '</span><span style="width:130px;text-align:right;font-size:18px;font-weight:600' + (v < 0 ? ';color:#8E2A22' : '') + '">' + rs(v) + '</span></div>').join('') + '</div>' +
      '<div class="card" style="padding:4px 26px">' + byDoc.map(([k, v]) => '<div class="row"><span class="grow">' + esc(k) + '\'s patients</span><span style="font-weight:600">' + rs(v) + '</span></div>').join('') + '</div>' +
      (dk.length > 1 ? '<div class="card pad"><div class="muted small">Day by day</div><div class="vbars" style="gap:6px">' + dk.map(d => '<div class="col" title="' + CD.d(d) + ': ' + rs(days[d]) + '"><i style="height:' + Math.round(days[d] / mx * 120) + 'px"></i><span class="muted" style="font-size:11px">' + d.slice(8) + '</span></div>').join('') + '</div></div>' : '') +
      '<div class="flex wrap"><button class="ghost" data-a="moneyCsv" data-from="' + from + '">Download for my CA (Excel)</button><button class="ghost" data-a="moneyPdf" data-from="' + from + '">Print / PDF</button></div></main>';
  };
  const billRows = bills => bills.slice().sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1).map(b => { const p = CD.P(b.pid); return [CD.d(b.date), CD.t(b.time), b.no, p ? p.name : '', b.items.map(i => i.n).join(' + '), b.mode, b.total, b.refund ? b.refund.amt : 0, CD.netOf(b), b.by]; });
  const billHead = ['Date', 'Time', 'Bill no', 'Patient', 'Items', 'Mode', 'Amount ₹', 'Refund ₹', 'Net ₹', 'By'];
  A.moneyCsv = ds => CD.csv('Collection-' + ds.from + '-to-' + S().today + '.csv', [billHead].concat(billRows(billsBetween(ds.from, S().today))));
  A.moneyPdf = ds => { if (ds.from === S().today) return CD.print('Day report', CD.docs.daily()); if (ds.from.slice(8) === '01') return CD.print('Monthly summary', CD.docs.monthly()); const bills = billsBetween(ds.from, S().today); CD.print('Collection', '<h1>' + esc(C().name) + '</h1><div style="color:#666;margin-bottom:12px">Collection ' + CD.d(ds.from) + ' – ' + CD.d(S().today) + ' · ' + bills.length + ' bills · net ' + rs(net(bills)) + '</div><table><tr>' + billHead.map(h => '<th>' + h + '</th>').join('') + '</tr>' + billRows(bills).map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</table>'); };

  /* ================= CASH ================= */
  SC.cash = function () {
    const c = C();
    const open = c.cashDays.filter(x => x.diff !== 0 && !x.checked);
    return hdr() + '<main class="pg narrow">' + CD.backBtn() + '<h1 class="t">Cash check</h1>' +
      (open.length ? open.map(x => '<div class="card pad" style="border-color:#E8B9B4;background:#FDF3F2"><div style="font-size:20px;font-weight:600;color:#8E2A22">' + CD.rel(x.date) + ' the drawer was ' + (x.diff < 0 ? 'short' : 'extra') + ' by ' + rs(Math.abs(x.diff)) + '</div><div style="color:#3A4458">Should have been ' + rs(x.expected) + ' · ' + esc(x.by) + ' counted ' + rs(x.counted) + (x.note ? ' · note: "' + esc(x.note) + '"' : '') + '</div><div class="flex wrap" style="margin-top:12px"><button class="btn" data-a="cashOk" data-v="' + x.date + '">Okay, mark as checked</button><button class="ghost" data-a="askPriya" data-v="' + x.date + '">Ask ' + esc(x.by) + '</button></div></div>').join('') : '<div class="card pad soft">Nothing to check. Every day matched.</div>') +
      '<div class="muted" style="margin-top:8px">Last days</div><div class="card" style="padding:4px 26px">' + c.cashDays.slice(0, 10).map(x => '<div class="row"><span class="grow" style="font-size:18px">' + CD.day(x.date) + '</span><span class="muted small">' + rs(x.counted) + ' counted</span><span style="width:130px;text-align:right;font-weight:600" class="' + (x.diff === 0 ? 'ok' : (x.checked ? 'warn' : 'bad')) + '">' + (x.diff === 0 ? 'Matched' : (x.diff < 0 ? 'Short ' : 'Extra ') + rs(Math.abs(x.diff)) + (x.checked ? ' ✓' : '')) + '</span></div>').join('') + '</div></main>';
  };
  A.cashOk = ds => { const x = C().cashDays.find(y => y.date === ds.v); x.checked = true; CD.toast('Marked as checked'); CD.render(); };
  A.askPriya = ds => { const x = C().cashDays.find(y => y.date === ds.v); C().calls.push({ id: CD.uid('c'), pid: null, name: 'Owner', phone: '', why: 'Owner asked about cash ' + (x.diff < 0 ? 'short' : 'extra') + ' ' + rs(Math.abs(x.diff)) + ' on ' + CD.d(x.date), when: S().clock, how: 'note from owner', done: false }); CD.toast('Note sent to ' + x.by + ' (shows in her Calls list)'); };

  /* ================= STAFF ================= */
  SC.staff = function () {
    const c = C(), s = S(); const tv = CD.todays();
    const stats = st => st.role === 'Reception' ? tv.filter(v => v.tok && v.tok !== 'Rx').length + ' patients registered' : tv.filter(v => v.doc === st.id && v.status === 'done').length + ' patients seen';
    const P = [['discount', 'Give discount'], ['refund', 'Refund money'], ['editBill', 'Change a bill after it is printed'], ['money', 'See money reports']];
    const log = c.log.slice().sort((a, b) => (a.date + String(a.time).padStart(4, '0')) < (b.date + String(b.time).padStart(4, '0')) ? 1 : -1);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Staff</h1><div class="card" style="padding:4px 26px">' + c.staff.map(st => '<div class="row"><div class="grow"><div style="font-size:19px;font-weight:600">' + esc(st.name) + '</div><div class="muted" style="font-size:16px">' + esc(st.role) + (st.since ? ' · since ' + esc(st.since) : '') + '</div></div><span style="color:#3A4458">' + stats(st) + '</span></div>').join('') + '<div class="row"><button class="txt" data-a="addStaff">+ Add staff</button></div></div>' +
      '<div class="muted" style="margin-top:8px">What reception is allowed to do</div><div class="card" style="padding:4px 26px">' + P.map(([k, l]) => '<div class="row"><span class="grow" style="font-size:18px">' + l + '</span>' + sw(c.perms[k], 'togglePerm', k) + '</div>').join('') + '</div>' +
      '<div class="muted" style="margin-top:8px">Every change to a bill, with who did it</div><div class="card" style="padding:4px 26px">' + (log.length ? log.slice(0, UI.f.allLog === '1' ? 200 : 8).map(l => '<div class="row" style="align-items:flex-start"><span class="muted small" style="width:120px">' + CD.d(l.date) + ' ' + CD.tShort(l.time) + '</span><span class="grow"><strong>' + esc(l.who) + '</strong> ' + esc(l.what) + (l.why ? '<br><span class="muted small">"' + esc(l.why) + '"</span>' : '') + '</span></div>').join('') : '<div class="empty">No changes.</div>') + '</div>' + (log.length > 8 ? '<button class="txt" data-a="pick" data-k="allLog" data-v="' + (UI.f.allLog === '1' ? '0' : '1') + '">' + (UI.f.allLog === '1' ? 'Show less' : 'See all ' + log.length + ' changes') + '</button>' : '') + '</main>';
  };
  A.togglePerm = ds => { const c = C(); c.perms[ds.k] = !c.perms[ds.k]; CD.toast(c.perms[ds.k] ? 'Allowed' : 'Turned off — reception will see "turned off by the owner"'); CD.render(); };
  A.addStaff = () => { UI.f.ns = { name: '', role: 'Reception' }; CD.modal('<h2 class="t">Add staff</h2><div><span class="flbl">Name</span><input class="field" data-ai="nsSet" data-k="name"></div><div><span class="flbl">Role</span><div class="choices">' + ['Reception', 'Nurse', 'Pharmacy', 'Manager'].map(r => '<button class="choice sm" data-a="nsRole" data-v="' + r + '">' + r + '</button>').join('') + '</div></div><div class="muted small">They get their own login and see only their own app.</div><div class="flex"><button class="btn" data-a="nsSave">Add</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.nsSet = (ds, el) => { UI.f.ns[ds.k] = el.value; };
  A.nsRole = (ds, el) => { UI.f.ns.role = ds.v; document.querySelectorAll('.modal .choice').forEach(x => x.classList.toggle('on', x === el)); };
  A.nsSave = () => { const n = UI.f.ns; if (!n.name.trim()) { CD.toast('Write a name'); return; } C().staff.push({ id: CD.uid('st'), name: n.name.trim(), role: n.role, since: '' }); CD.closeModal(); CD.toast(n.name.trim() + ' added · login link sent on WhatsApp', true); CD.render(); };

  /* ================= GROWTH ================= */
  SC.growth = function () {
    const c = C(), s = S();
    const months = []; let e = s.today; for (let i = 0; i < 4; i++) { const st = monthStart(e); months.unshift([st, e]); e = CD.addDays(st, -1); }
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mv = months.map(([a, b]) => ({ l: MON[Number(a.slice(5, 7)) - 1], v: c.visits.filter(x => x.date >= a && x.date <= b && x.status === 'done').length, n: c.patients.filter(p => !p.merged && p.since >= a && p.since <= b).length }));
    const mx = Math.max(1, ...mv.map(x => x.v));
    const cur = mv[mv.length - 1], prev = mv[mv.length - 2];
    const since = CD.addDays(s.today, -90);
    const src = {}; c.patients.filter(p => !p.merged && p.since >= since).forEach(p => { src[p.source] = (src[p.source] || 0) + 1; });
    const sk = Object.entries(src).sort((a, b) => b[1] - a[1]); const smx = Math.max(1, ...sk.map(x => x[1]));
    const back = c.patients.filter(p => !p.merged && /lost/i.test(p.outcome)).length;
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Patients this month</h1><div class="card pad"><div class="big-num" style="font-size:48px">' + cur.v + '</div><div style="color:#3A4458">visits so far · ' + cur.n + ' new patients · last month ' + prev.v + ' visits, ' + prev.n + ' new</div></div>' +
      '<div class="card pad"><div class="muted small">Visits by month</div><div class="vbars">' + mv.map(x => '<div class="col"><span class="small">' + x.v + '</span><i style="height:' + Math.round(x.v / mx * 110) + 'px"></i><span class="muted small">' + x.l + '</span></div>').join('') + '</div></div>' +
      '<div class="muted">Where new patients came from (last 3 months)</div><div class="card pad" style="display:flex;flex-direction:column;gap:14px">' + sk.map(([k, v]) => '<div class="flex"><span style="width:160px">' + esc(k) + '</span><div class="bar"><i style="width:' + Math.round(v / smx * 100) + '%"></i></div><span style="width:44px;text-align:right;font-weight:600">' + v + '</span></div>').join('') + '</div>' +
      '<div class="card pad soft flex wrap"><span class="grow">' + back + ' patients did not come back after their first visit.</span><button class="ghost" data-a="winBack" data-n="' + back + '">Send them a "how are you?" message</button></div></main>';
  };
  A.winBack = ds => { C().inbox.push({ date: S().today, time: S().clock, pid: null, kind: 'Win-back', text: 'Sent to ' + ds.n + ' patients: "Hello! How is your skin now? Reply 1 to book a free review."', out: true }); CD.toast('Sent to ' + ds.n + ' patients on WhatsApp', true); };

  /* ================= REFERRALS ================= */
  SC.refs = function () {
    const c = C(); const due = c.refs.filter(r => !r.paid).reduce((x, r) => x + r.amt, 0);
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<div class="flex wrap" style="align-items:flex-end"><h1 class="t grow">Referrals · ' + rs(due) + ' to pay</h1><button class="btn" data-a="addRef">+ Add</button></div><div class="card" style="padding:4px 26px">' +
      c.refs.map(r => '<div class="row"><div class="grow"><div style="font-size:19px;font-weight:600">' + esc(r.name) + '</div><div class="muted" style="font-size:16px">' + esc(r.what) + '</div></div><span style="font-size:19px;font-weight:600' + (r.paid ? ';color:#9AA1AE;text-decoration:line-through' : '') + '">' + rs(r.amt) + '</span>' + (r.paid ? '<span class="badge b-ok">Paid ' + esc(r.paidOn ? CD.d(r.paidOn) : '') + '</span><button class="txt" data-a="refPaid" data-id="' + r.id + '">Undo</button>' : '<button class="ghost sm" data-a="refPaid" data-id="' + r.id + '">Mark paid</button>') + '</div>').join('') + '</div></main>';
  };
  A.refPaid = ds => { const r = C().refs.find(x => x.id === ds.id); r.paid = !r.paid; r.paidOn = r.paid ? S().today : null; CD.render(); };
  A.addRef = () => { UI.f.nr = { name: '', what: '', amt: '' }; CD.modal('<h2 class="t">Add a referral to pay</h2><div><span class="flbl">Who</span><input class="field" data-ai="nrSet" data-k="name" placeholder="Dr. / lab / PRO name"></div><div><span class="flbl">For what</span><input class="field" data-ai="nrSet" data-k="what" placeholder="e.g. 3 patients"></div><div><span class="flbl">Amount ₹</span><input class="field" inputmode="numeric" data-ai="nrSet" data-k="amt"></div><div class="flex"><button class="btn" data-a="nrSave">Add</button><button class="txt" data-a="close">Cancel</button></div>'); };
  A.nrSet = (ds, el) => { UI.f.nr[ds.k] = el.value; };
  A.nrSave = () => { const n = UI.f.nr; if (!n.name.trim() || !(Number(n.amt) > 0)) { CD.toast('Fill name and amount'); return; } C().refs.push({ id: CD.uid('f'), name: n.name.trim(), what: n.what.trim(), amt: Number(n.amt), paid: false }); CD.closeModal(); CD.render(); };

  /* ================= REPORTS ================= */
  const REPS = [
    ['daily', 'Daily collection', 'Every bill today with cash / UPI / card'],
    ['monthly', 'Monthly summary', 'Day by day for this month, with GST'],
    ['doctor', 'Doctor-wise earnings', 'Each doctor this month'],
    ['refunds', 'Refunds and changed bills', 'Who did what, and when'],
    ['patients', 'Patient list', 'Name, phone, first and last visit']
  ];
  function reportData(k) {
    const c = C(), s = S(); const ms = monthStart(s.today);
    if (k === 'daily') return [billHead].concat(billRows(billsBetween(s.today, s.today)));
    if (k === 'monthly') { const rows = [['Date', 'Bills', 'Cash ₹', 'UPI ₹', 'Card ₹', 'GST in it ₹', 'Net ₹']]; const days = {}; billsBetween(ms, s.today).forEach(b => { const d = days[b.date] = days[b.date] || { n: 0, Cash: 0, UPI: 0, Card: 0, gst: 0, net: 0 }; d.n++; d[b.mode] += CD.netOf(b); d.net += CD.netOf(b); b.items.forEach(i => { if (i.gst) d.gst += i.amt - i.amt / (1 + i.gst / 100); }); }); Object.keys(days).sort().forEach(d => { const x = days[d]; rows.push([CD.d(d), x.n, x.Cash, x.UPI, x.Card, Math.round(x.gst), x.net]); }); return rows; }
    if (k === 'doctor') { const vd = {}; c.visits.forEach(v => { vd[v.pid + v.date] = v.doc; }); const b = billsBetween(ms, s.today); return [['Doctor', 'Patients seen', 'Billed ₹', 'Share %', 'Share ₹']].concat(c.doctors.map(d => { const t = net(b.filter(x => vd[x.pid + x.date] === d.id)); return [d.name, c.visits.filter(v => v.doc === d.id && v.date >= ms && v.status === 'done').length, t, Math.round(d.share * 100), Math.round(t * d.share)]; })); }
    if (k === 'refunds') return [['Date', 'Time', 'Who', 'What', 'Why']].concat(c.log.slice().sort((a, b) => a.date < b.date ? 1 : -1).map(l => [CD.d(l.date), CD.t(l.time), l.who, l.what, l.why]));
    if (k === 'patients') { const fv = {}, lv = {}; c.visits.forEach(v => { if (!fv[v.pid] || v.date < fv[v.pid]) fv[v.pid] = v.date; if (!lv[v.pid] || v.date > lv[v.pid]) lv[v.pid] = v.date; }); return [['Name', 'Age', 'Sex', 'Phone', 'Came from', 'First visit', 'Last visit']].concat(c.patients.filter(p => !p.merged).map(p => [p.name, p.age, p.sex, p.phone, p.source, fv[p.id] ? CD.d(fv[p.id]) : '', lv[p.id] ? CD.d(lv[p.id]) : ''])); }
    return [];
  }
  SC.reports = function () {
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Reports</h1>' + REPS.map(([k, n, d]) => '<div class="card list-card"><div class="grow"><div style="font-size:19px;font-weight:600">' + n + '</div><div class="muted" style="font-size:16px">' + d + ' · ' + (reportData(k).length - 1) + ' rows</div></div><button class="ghost sm" data-a="repCsv" data-k="' + k + '">Excel</button><button class="ghost sm" data-a="repPdf" data-k="' + k + '">PDF</button></div>').join('') + '</main>';
  };
  A.repCsv = ds => { const r = REPS.find(x => x[0] === ds.k); CD.csv(r[1].replace(/\W+/g, '-') + '-' + S().today + '.csv', reportData(ds.k)); };
  A.repPdf = ds => { if (ds.k === 'daily') return CD.print('Day report', CD.docs.daily()); if (ds.k === 'monthly') return CD.print('Monthly summary', CD.docs.monthly()); const r = REPS.find(x => x[0] === ds.k); const rows = reportData(ds.k); CD.print(r[1], '<h1>' + esc(C().name) + '</h1><div style="color:#666;margin-bottom:12px">' + r[1] + ' · ' + CD.day(S().today) + '</div><table><tr>' + rows[0].map(h => '<th>' + esc(h) + '</th>').join('') + '</tr>' + rows.slice(1).map(x => '<tr>' + x.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</table>'); };

  /* ================= SETTINGS ================= */
  const COLORS = ['#8A6A1F', '#1F3A68', '#1E5B46', '#0F6B66', '#7A2E4F', '#A3271F'];
  SC.settings = function () {
    const c = C();
    const rows = [
      ['doctors', 'Doctors', c.doctors.map(d => d.name + (d.spec ? ' (' + d.spec.toLowerCase() + ')' : '')).join(' · ')],
      ['timings', 'Timings', c.timings],
      ['fees', 'Fees', 'New ' + rs(c.fee) + ' · Follow-up free within ' + c.freeDays + ' days'],
      ['treat', 'Treatments and prices', c.treatments.length + ' items · ' + c.treatments.slice(1, 4).map(t => t.n.split(' (')[0].toLowerCase()).join(', ') + '…'],
      ['gst', 'Bill and GST', (c.gstin ? 'GSTIN ' + c.gstin : 'No GSTIN') + ' · bill no. ' + c.billPrefix + c.billNo],
      ['msgs', 'WhatsApp messages', 'Token, receipt, reminder, doctor out — edit the words']
    ];
    const B = [['r_appt', 'Reception · Appointments'], ['r_close', 'Reception · Close the day'], ['d_sets', 'Doctor · Rx sets'], ['p_reports', 'Patient · My reports'], ['p_pay', 'Patient · Pay online']];
    return hdr() + '<main class="pg mid">' + CD.backBtn() + '<h1 class="t">Clinic settings</h1><p class="muted" style="margin:0">Change anything here. The app, the WhatsApp bot and the patient page update by themselves.</p>' +
      '<div class="grid2"><div class="card pad" style="display:flex;flex-direction:column;gap:12px"><div style="font-size:19px;font-weight:600">Look</div><div class="flex"><span class="logo" style="--brand:' + c.color + ';width:56px;height:56px;border-radius:28px;font-size:26px">' + esc(c.logo) + '</span><div class="grow"><input class="field" style="height:46px" value="' + esc(c.name) + '" data-ai="setName" aria-label="Clinic name"></div><input class="field" style="height:46px;width:64px;text-align:center" maxlength="2" value="' + esc(c.logo) + '" data-ai="setLogo" aria-label="Logo letter"></div><div class="flex" style="gap:12px">' + COLORS.map(col => '<button aria-label="Colour ' + col + '" data-a="setColor" data-v="' + col + '" style="width:36px;height:36px;border-radius:18px;border:0;background:' + col + ';outline:' + (c.color === col ? '2px solid #16213A' : 'none') + ';outline-offset:3px"></button>').join('') + '</div><div class="muted small">The colour shows on the patient page and on bills.</div></div>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><div style="font-size:19px;font-weight:600">WhatsApp language</div><div class="choices">' + [['en', 'English'], ['hl', 'Hindi (Roman)']].map(([k, l]) => '<button class="choice' + (c.lang === k ? ' on' : '') + '" data-a="setLang" data-v="' + k + '">' + l + '</button>').join('') + '</div><div class="muted small">Messages the bot and desk send to patients.</div><div style="font-size:16px;font-weight:600;margin-top:8px">Patient line on prescriptions</div><div class="choices">' + [['hi', 'हिंदी'], ['hl', 'Hindi (Roman)'], ['en', 'English']].map(([k, l]) => '<button class="choice sm' + ((c.rxLang || 'hi') === k ? ' on' : '') + '" data-a="setRxLang" data-v="' + k + '">' + l + '</button>').join('') + '</div><div class="muted small" style="margin-top:6px">Patient link: <strong>desk.bas30din.com/' + esc(c.slug) + '</strong></div></div></div>' +
      '<div class="card" style="padding:4px 26px">' + rows.map(([k, l, v]) => '<div class="row"><div class="grow"><div style="font-size:18px;font-weight:600">' + l + '</div><div class="muted" style="font-size:16px">' + esc(v) + '</div></div><button class="ghost sm" data-a="editSetting" data-k="' + k + '">Change</button></div>').join('') + '</div>' +
      '<div class="card" style="padding:4px 26px"><div style="padding:14px 0 4px;font-size:18px;font-weight:600">Boxes on each home screen</div>' + B.map(([k, l]) => '<div class="row"><span class="grow" style="font-size:17px">' + l + '</span>' + sw(c.boxes[k], 'toggleBox', k) + '</div>').join('') + '</div></main>';
  };
  A.setName = (ds, el) => { const c = C(); c.name = el.value; c.short = el.value.split(' ')[0]; };
  A.setLogo = (ds, el) => { C().logo = el.value.toUpperCase() || 'A'; };
  A.setColor = ds => { C().color = ds.v; CD.render(); };
  A.setLang = ds => { C().lang = ds.v; CD.toast(ds.v === 'hl' ? 'WhatsApp messages will go in Hindi (Roman)' : 'WhatsApp messages will go in English'); CD.render(); };
  A.setRxLang = ds => { C().rxLang = ds.v; CD.render(); };
  A.toggleBox = ds => { const c = C(); c.boxes[ds.k] = !c.boxes[ds.k]; CD.render(); };
  A.editSetting = ds => { UI.f.es = JSON.parse(JSON.stringify(pickSetting(ds.k))); UI.f.esk = ds.k; CD.modal(settingForm, true); };
  function pickSetting(k) { const c = C(); return k === 'doctors' ? c.doctors : k === 'timings' ? { t: c.timings } : k === 'fees' ? { fee: c.fee, free: c.freeDays } : k === 'treat' ? c.treatments : k === 'gst' ? { gstin: c.gstin, pre: c.billPrefix } : c.msgs; }
  function settingForm() {
    const k = UI.f.esk, e = UI.f.es, c = C();
    const inp = (path, val, ph, w) => '<input class="field" style="height:48px' + (w ? ';width:' + w : '') + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '" data-ai="esSet" data-p="' + path + '">';
    let body = '';
    if (k === 'doctors') body = e.map((d, i) => '<div class="card pad" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px;align-items:center">' + inp(i + '.name', d.name, 'Dr. name') + inp(i + '.spec', d.spec, 'Speciality') + timeSel(i + '.from', d.from) + timeSel(i + '.to', d.to) + '<button class="txt" style="color:#8E2A22;text-decoration:none" data-a="esRmRow" data-i="' + i + '" aria-label="Remove">✕</button></div>').join('') + '<button class="txt" data-a="esAddDoc">+ Add doctor</button>';
    if (k === 'timings') body = '<div><span class="flbl">Shown to patients</span>' + inp('t', e.t) + '</div>';
    if (k === 'fees') body = '<div class="grid2"><div><span class="flbl">New consultation ₹</span>' + inp('fee', e.fee) + '</div><div><span class="flbl">Follow-up is free within (days)</span>' + inp('free', e.free) + '</div></div>';
    if (k === 'treat') body = e.map((t, i) => '<div class="flex" style="gap:10px">' + inp(i + '.n', t.n, 'Name') + inp(i + '.p', t.p, '₹', '120px') + '<select class="field" style="height:48px;width:140px" data-ai="esSet" data-p="' + i + '.gst">' + [0, 5, 18].map(g => '<option value="' + g + '"' + (Number(t.gst) === g ? ' selected' : '') + '>GST ' + g + '%</option>').join('') + '</select>' + (i ? '<button class="txt" style="color:#8E2A22;text-decoration:none" data-a="esRmRow" data-i="' + i + '" aria-label="Remove">✕</button>' : '<span style="width:20px"></span>') + '</div>').join('') + '<button class="txt" data-a="esAddTr">+ Add treatment</button>';
    if (k === 'gst') body = '<div class="grid2"><div><span class="flbl">GSTIN (leave empty if none)</span>' + inp('gstin', e.gstin) + '</div><div><span class="flbl">Bill number starts with</span>' + inp('pre', e.pre) + '</div></div>';
    if (k === 'msgs') { const L = { token: 'Token sent', turn: 'Your turn', out: 'Doctor stepped out', receipt: 'Receipt', rx: 'Prescription ready', reminder: 'Follow-up reminder', booked: 'Appointment booked', leave: 'Doctor on leave' }; const lang = c.lang === 'hl' ? 'hl' : 'en'; body = '<div class="muted small">Words in {curly brackets} are filled in by the app. Editing the ' + (lang === 'hl' ? 'Hindi' : 'English') + ' messages.</div>' + Object.keys(L).map(x => '<div><span class="flbl">' + L[x] + '</span><textarea class="field" data-ai="esSet" data-p="' + lang + '.' + x + '">' + esc(e[lang][x]) + '</textarea></div>').join(''); }
    return '<h2 class="t">' + ({ doctors: 'Doctors', timings: 'Timings', fees: 'Fees', treat: 'Treatments and prices', gst: 'Bill and GST', msgs: 'WhatsApp messages' })[k] + '</h2>' + body + '<div class="flex"><button class="btn" data-a="esSaveSetting">Save</button><button class="txt" data-a="close">Cancel</button></div>';
  }
  function timeSel(path, v) { const o = []; for (let t = 420; t <= 1320; t += 30) o.push(t); return '<select class="field" style="height:48px" data-ai="esSet" data-p="' + path + '">' + o.map(t => '<option value="' + t + '"' + (t === v ? ' selected' : '') + '>' + CD.tShort(t) + '</option>').join('') + '</select>'; }
  A.esSet = (ds, el) => { const parts = ds.p.split('.'); let o = UI.f.es; while (parts.length > 1) o = o[parts.shift()]; const k = parts[0]; o[k] = (typeof o[k] === 'number') ? Number(el.value) : el.value; };
  A.esRmRow = ds => { UI.f.es.splice(Number(ds.i), 1); CD.renderModal(); };
  A.esAddDoc = () => { UI.f.es.push({ id: CD.uid('d'), name: '', short: '', spec: '', she: false, from: 600, to: 840, days: 'Mon–Sat', status: 'later', out: null, share: 0.5 }); CD.renderModal(); };
  A.esAddTr = () => { UI.f.es.push({ id: CD.uid('t'), n: '', p: 0, cat: 'procedure', gst: 0 }); CD.renderModal(); };
  A.esSaveSetting = () => {
    const c = C(), k = UI.f.esk, e = UI.f.es;
    if (k === 'doctors') { const ok = e.filter(d => d.name.trim()); if (!ok.length) { CD.toast('Keep at least one doctor'); return; } ok.forEach(d => { d.name = d.name.trim(); d.short = d.name.replace(/^Dr\.?\s*/i, 'Dr. ').split(' ').slice(0, 2).join(' '); d.from = Number(d.from); d.to = Number(d.to); }); c.doctors = ok; }
    if (k === 'timings') c.timings = e.t;
    if (k === 'fees') { const fee = Number(e.fee); if (!(fee >= 0)) { CD.toast('Fee must be a number'); return; } c.fee = fee; c.freeDays = Number(e.free) || 0; const t = c.treatments.find(x => x.cat === 'consult'); if (t) t.p = fee; }
    if (k === 'treat') c.treatments = e.filter(t => t.n.trim()).map(t => Object.assign(t, { p: Number(t.p) || 0, gst: Number(t.gst) || 0 }));
    if (k === 'gst') { c.gstin = e.gstin.trim(); c.billPrefix = e.pre.trim() || c.billPrefix; }
    if (k === 'msgs') c.msgs = e;
    CD.closeModal(); CD.toast('Saved · updates everywhere'); CD.render();
  };
})();
