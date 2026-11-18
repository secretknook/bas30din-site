// ================= Clinic Desk v8: the four-app design (owner, doctor, reception, patient) =================
// Everything the new app needs comes from v8State(); every change goes through v8Act().
const V8_SRC = { walkin: 'Walk-in', wa: 'WhatsApp bot', mc: 'Missed call', ref: 'Referral', ig: 'Instagram', google: 'Google', friend: 'Someone told them', board: 'Clinic board / poster', doctor: 'Another doctor', other: 'Other' };
const v8min = iso => { const d = DateTime.fromISO(iso || ''); if (!d.isValid) return now.hour * 60 + now.minute; const z = d.setZone(TZ); return z.hour * 60 + z.minute; };
const v8ph10 = ph => String(ph || '').replace(/\D/g, '').slice(-10);
const v8full = ph => { const d = String(ph || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
const v8cat = n => /medicine|tablet|cream|gel|lotion|shampoo|sunscreen|pharmacy/i.test(n) ? 'medicine' : /consult|follow-up|check-up|session|opd/i.test(n) ? 'consult' : 'procedure';
const v8mode = m => m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Cash';
const v8hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function v8pinfo(pk) { if (!mem.pinfo) mem.pinfo = {}; return mem.pinfo[pk] || (mem.pinfo[pk] = {}); }
function v8cfg() { if (!mem.cfg) mem.cfg = {}; return mem.cfg; }
function v8hoursOf() { const cf = v8cfg(); const o = cf.open || '10:00', c = cf.close || '20:00'; const t = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; }; return [t(o), t(c)]; }
function v8visit(day, k) { return visOf(day).find(x => x.k === k); }
function v8ensureVisit(tk) {
  if (!mem.vis) mem.vis = {};
  const l = mem.vis[todayStr] || (mem.vis[todayStr] = []);
  let v = l.find(x => x.k === tk.key);
  if (!v) { v = { k: tk.key, tok: tk.tok, name: tk.name || 'Patient', ph: tk.phone || '', tin: tk.at || '', in: '', out: '', fee: null, m: null, fupSug: 0, prob: tk.prob || '', pre: true }; l.push(v); }
  return v;
}
function v8bill(v, items, m, disc, by, sendWa, out) {
  const was = v.m ? { fee: v.fee || 0, m: v.m } : null;
  const list = (items || []).map(x => ({ n: String(x.n || '').slice(0, 60), p: Math.max(0, Math.round(Number(x.p) || 0)), g: [0, 5, 12, 18].includes(Number(x.g)) ? Number(x.g) : 0 })).filter(x => x.n).slice(0, 12);
  const tot = list.reduce((a, x) => a + x.p, 0);
  v.items = list; v.m = ['cash', 'upi', 'card', 'free'].includes(m) ? m : 'cash';
  v.fee = v.m === 'free' ? 0 : Math.max(0, tot - Math.max(0, Math.min(tot, Math.round(Number(disc) || 0))));
  if (was && (was.fee !== v.fee || was.m !== v.m)) { v.edited = (v.edited || 0) + 1; mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: v.k, inv: v.inv || 0, name: v.name, from: was, to: { fee: v.fee, m: v.m } }]).slice(-400); }
  if (!v.inv) { mem.invSeq = (mem.invSeq || 0) + 1; v.inv = mem.invSeq; v.ik = sha256(v.k + now.toISO() + Math.random()).slice(0, 12); }
  if (!was) { v.by = by; v.at = now.toISO(); } else { v.eby = by; v.eat = now.toISO(); }
  if (sendWa !== false && v.ph && v.m !== 'free' && inWindow(v.ph)) {
    const day = DateTime.fromISO(v.at).setZone(TZ).toFormat('yyyy-MM-dd');
    const url = (S.appUrl || 'https://desk.bas30din.com/') + '?inv=' + day + '.' + v.k + '.' + v.ik;
    out.push(ctaTo(v.ph, (langOf(v.ph, '') === 'en' ? `🧾 *Payment received${was ? ' (revised bill)' : ''}, thank you!*\n\nDear ${v.name}, ${rupees(v.fee)} received by ${v8mode(v.m)}.\n\n🧾 *Invoice no:* ${invNo(v)}` : `🧾 *Payment mil gaya${was ? ' (revised bill)' : ''}, dhanyavaad!*\n\n${v.name} ji, ${rupees(v.fee)} ${v8mode(v.m)} se mil gaye.\n\n🧾 *Invoice no:* ${invNo(v)}`), langOf(v.ph, '') === 'en' ? 'View invoice' : 'Invoice dekhein', url));
  }
  return v;
}
function v8state(role, isDoc, sess) {
  const q = qRead(); const cf = v8cfg(); const Z = BIZ();
  const [h0, h1] = v8hoursOf();
  const dr = docRead();
  const dstat = dr.status === 'in' ? 'in' : (dr.status === 'away' || dr.status === 'late') ? 'out' : dr.status === 'leave' ? 'gone' : 'in';
  const docp = cf.docp || {};
  const doctors = [{ id: 'd0', name: S.doctorName || 'Doctor', short: String(S.doctorName || 'Doctor').split(' ').slice(0, 2).join(' '), spec: docp.spec || '', she: true, from: h0, to: h1, days: (cf.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']).length === 6 ? 'Mon–Sat' : (cf.days || []).map(d => d[0].toUpperCase() + d.slice(1)).join(', '),
    status: dstat, out: dstat === 'out' ? { until: dr.until ? v8min(dr.until) : (now.hour * 60 + now.minute + (dr.mins || 15)), reason: dr.reason || (dr.status === 'late' ? 'Running late' : 'Stepped out'), told: (dr.told || []).length } : null,
    deg: docp.qual || '', reg: docp.reg || Z.reg || '', council: docp.council || '', share: 1, visiting: false }];
  // patients
  const P = {}; const addP = (pk, name, ph, since) => { if (!pk) return null; const p = P[pk] || (P[pk] = { id: pk, name: name || 'Patient', phone: v8ph10(ph), since: since || todayStr, source: '', problem: '', words: '', allergies: '', outcome: '', doc: 'd0', sex: '', age: 0 }); if (name && (!p.name || p.name === 'Patient')) p.name = name; if (since && since < p.since) p.since = since; return p; };
  const days = Object.keys(mem.vis || {}).sort();
  for (const d of days) for (const v of mem.vis[d]) { const p = addP(patKey(v.ph, v.name), v.name, v.ph, d); if (v.prob) { p.problem = v.prob; p.words = v.prob; } }
  for (const tk of q.list) { const p = addP(patKey(tk.phone, tk.name), tk.name, tk.phone, todayStr); if (tk.prob) { p.problem = tk.prob; p.words = tk.prob; } }
  for (const r of rows) if (r.phone && r.date >= now.minus({ days: 60 }).toFormat('yyyy-MM-dd')) { const p = addP(patKey(r.phone, r.name), r.name, r.phone, r.date); if (!p.problem && r.service) p.problem = r.service; }
  for (const a of (mem.appts || [])) addP(a.pid, a.name, a.phone, a.date);
  for (const pk of Object.keys(P)) { const p = P[pk]; const inf = (mem.pinfo || {})[pk] || {}; Object.assign(p, { sex: inf.sex || '', age: inf.age || 0, rel: inf.rel || '', allergies: inf.allergies || '', wt: inf.wt || '' }); if (inf.name) p.name = inf.name;
    const full = v8full(p.phone); const s0 = (mem.src || {})[full]; p.source = s0 ? (V8_SRC[s0.s] || SRC[s0.s] || s0.s) : ((mem.ev || {})[full] ? 'WhatsApp bot' : 'Walk-in'); p.uhid = (mem.uhid || {})[pk] ? Z.prefix + '-' + String(mem.uhid[pk]).padStart(6, '0') : ''; }
  // visits + bills
  const visits = [], bills = [];
  const tkByKey = {}; q.list.forEach(t => { tkByKey[t.key] = t; });
  const firstDay = {}; for (const d of days) for (const v of mem.vis[d]) { const pk = patKey(v.ph, v.name); if (!firstDay[pk]) firstDay[pk] = d; }
  for (const d of days) for (const v of mem.vis[d]) {
    const pk = patKey(v.ph, v.name); const tk = d === todayStr ? tkByKey[v.k] : null;
    let st = v.out ? 'done' : 'waiting'; if (tk) st = tk.st === 's' ? 'cabin' : tk.st === 'd' ? 'done' : tk.st === 'x' ? 'left' : 'waiting';
    const kind = v.kind || (firstDay[pk] === d ? 'new' : 'follow');
    const vv = { date: d, time: v8min(v.tin || v.in || v.at), pid: pk, doc: 'd0', kind, status: st, tok: v.tok || '', k: v.k, prob: v.prob || '' };
    if (tk) { vv.key = tk.key; vv.missed = tk.missed || 0; if (tk.src === 'book' && !tk.here && tk.st === 'w') { vv.status = 'booked'; vv.booked = tk.bookAt ? (Number(String(tk.bookAt).slice(0, 2)) * 60 + Number(String(tk.bookAt).slice(3, 5)) || null) : null; } }
    if (v.m && v.m !== 'free') {
      const its = (v.items && v.items.length ? v.items : [{ n: 'Consultation', p: v.fee || 0, g: 0 }]);
      const listTot = its.reduce((a, x) => a + x.p, 0);
      const b = { no: invNo(v), date: d, time: v8min(v.at), pid: pk, items: its.map(x => ({ n: x.n, amt: x.p, cat: v8cat(x.n), gst: x.g || 0 })), total: v.fee || 0, mode: v8mode(v.m), by: v.by || '', refund: v.refund || null, k: v.k, day: d, inv: v.ik ? (d + '.' + v.k + '.' + v.ik) : '' };
      if (listTot > (v.fee || 0)) b.discount = listTot - (v.fee || 0);
      bills.push(b); vv.bill = b.no;
    }
    if (v.m === 'free') { vv.free = true; vv.payLaterOk = true; }
    visits.push(vv);
  }
  for (const tk of q.list) { if (visits.some(x => x.date === todayStr && x.k === tk.key)) continue; const pk = patKey(tk.phone, tk.name);
    let st = tk.st === 's' ? 'cabin' : tk.st === 'd' ? 'done' : tk.st === 'x' ? 'left' : 'waiting';
    const vv = { date: todayStr, time: v8min(tk.at), pid: pk, doc: 'd0', kind: tk.kind || (firstDay[pk] && firstDay[pk] < todayStr ? 'follow' : 'new'), status: st, tok: tk.tok, k: tk.key, key: tk.key, missed: tk.missed || 0, prob: tk.prob || '', src: tk.src };
    if (tk.src === 'book' && !tk.here && tk.st === 'w') vv.status = 'booked';
    if (tk.payLater) vv.payLaterOk = true;
    if (tk.tr) vv.tr = tk.tr;
    visits.push(vv); }
  for (const vv of visits) if (vv.date === todayStr && tkByKey[vv.k]) { const tk = tkByKey[vv.k]; if (tk.kind) vv.kind = tk.kind; if (tk.payLater) vv.payLaterOk = true; if (tk.started) vv.started = tk.started; }
  // appointments: WhatsApp bookings in the sheet + desk bookings
  const hide = mem.apptHide || {};
  const appts = rows.filter(r => r.date >= todayStr && active(r) && !hide['s' + r.row_number] && !q.list.some(t => t.phone === r.phone && t.st !== 'x' && r.date === todayStr))
    .map(r => { const t = at(r.date, r.time); return { id: 's' + r.row_number, date: r.date, time: t.hour * 60 + t.minute, pid: patKey(r.phone, r.name), doc: 'd0', src: 'WhatsApp' + (r.service ? ' · ' + r.service : '') }; })
    .concat((mem.appts || []).filter(a => a.date >= todayStr && !a.done).map(a => ({ id: a.id, date: a.date, time: a.time, pid: a.pid, doc: 'd0', src: a.src || 'Reception' })));
  // calls to return: call-back requests + missed calls not yet handled
  const calls = (mem.callbacks || []).map(c => ({ id: 'cb:' + c.phone, kind: 'cb', pid: patKey(c.phone, c.name), name: (mem.pname || {})[c.phone] || c.name || 'Unknown', phone: v8ph10(c.phone), why: c.reason || 'Asked for a call back', when: v8min(c.at), how: c.noans ? 'no answer ×' + c.noans : (c.tryAt ? 'calling…' : 'on WhatsApp'), done: false }))
    .concat((mem.mcalls || []).filter(x => x.at >= now.startOf('day').toISO() && !(mem.callbacks || []).some(c => c.phone === x.ph) && !rows.some(r => r.phone === x.ph && active(r)) && !q.list.some(t => t.phone === x.ph))
      .map(x => ({ id: 'mc:' + x.ph, kind: 'mc', pid: patKey(x.ph, ''), name: (mem.pname || {})[x.ph] || 'Unknown', phone: v8ph10(x.ph), why: 'Missed call · WhatsApp sent, no booking yet', when: v8min(x.at), how: 'missed call', done: false })));
  for (const c of calls) if (!P[c.pid]) addP(c.pid, c.name, c.phone, todayStr);
  const cbDone = (mem.cbLog || []).filter(x => x.done && x.done >= now.startOf('day').toISO()).map(x => ({ id: 'cbd:' + x.ph + x.done, name: (mem.pname || {})[x.ph] || 'Patient', phone: v8ph10(x.ph), why: x.reason || '', when: v8min(x.at), done: true, result: 'Called back' }));
  // inbox: what the bot did today
  const inbox = [];
  for (const ph of Object.keys(mem.ev || {})) for (const e of mem.ev[ph]) if (e.at >= now.startOf('day').toISO()) inbox.push({ date: todayStr, time: v8min(e.at), pid: patKey(ph, ''), kind: ({ token: 'Token', booked: 'Booked by bot', talk: 'Asked to talk', cb: 'Call back', msg: 'Message', why: 'Message', recall: 'Reminder', try: 'Called', noans: 'No answer', done: 'Done', bot: 'Bot reply', call: 'Missed call' })[e.k] || e.k, text: e.t || '', out: ['bot', 'recall'].includes(e.k) });
  for (const x of inbox) if (!P[x.pid]) { const ph = x.pid.slice(1); addP(x.pid, (mem.pname || {})[ph] || ('+' + ph), ph, todayStr); }
  // cash days, expenses, refs, prescriptions
  const fl = Number(cf.float == null ? 2000 : cf.float) || 0;
  const cashDays = Object.keys(mem.close || {}).sort().reverse().slice(0, 30).map(d => { const c = mem.close[d]; const R = regSum(d, d); const petty = (mem.exp || []).filter(e => e.date === d && e.from === 'drawer').reduce((a, e) => a + e.amt, 0);
    const exp = c.expected != null ? c.expected : (c.v8 ? fl + R.cash - petty : R.cash); const counted = c.cash || 0; return { date: d, expected: exp, counted, diff: counted - exp, note: c.note || '', by: c.by || '', checked: !!c.checked || counted === exp, handed: c.handed != null ? c.handed : Math.max(0, counted - (c.v8 ? fl : 0)) }; });
  const rx = []; for (const pk of Object.keys(mem.rx || {})) for (const r of mem.rx[pk]) rx.push(Object.assign({ pid: pk }, r));
  const log = (mem.edits || []).slice(-200).map(x => { const d = DateTime.fromISO(x.at).setZone(TZ); return { date: d.toFormat('yyyy-MM-dd'), time: d.hour * 60 + d.minute, who: x.by, what: x.what || ('Changed bill of ' + x.name + ': ' + rupees(x.from.fee) + ' ' + v8mode(x.from.m) + ' → ' + rupees(x.to.fee) + ' ' + v8mode(x.to.m)), why: x.why || '' }; });
  const treat = billList().map((x, i) => ({ id: 't' + i, n: x.n, p: x.p, cat: v8cat(x.n), gst: x.g || 0 }));
  const clinic = {
    id: 'live', live: true, name: S.clinicName || C, short: String(S.clinicName || C).split(' ')[0], logo: cf.logo || String(S.clinicName || C)[0].toUpperCase(), color: cf.color || '#8A6A1F', slug: cf.slug || 'clinic',
    address: S.address || Z.address || '', phone: Z.phone || S.clinicPhone || '', gstin: Z.gstin || '', billPrefix: Z.prefix + '/', timings: cf.timings || timingsText('en').replace(/\n/g, ' · '),
    lang: S.defaultLang || 'en', rxLang: cf.rxLang || 'hi', fee: S.fee || 0, freeDays: S.followFreeDays === undefined ? 7 : Number(S.followFreeDays) || 0, float: fl,
    treatments: treat, sets: cf.rxsets || null, doctors, staff: (S.staff || []).map(x => ({ id: v8ph10(x.phone), name: x.name, role: x.role === 'owner' ? 'Owner' : x.role === 'doctor' ? 'Doctor' : 'Reception', phone: v8ph10(x.phone), since: '' })),
    patients: Object.values(P), visits, bills, rx, appts, calls: calls.concat(cbDone), inbox, reports: mem.preports || [], cashDays, refs: mem.refs || [], leaves: (mem.leaves || []).map(d => ({ doc: 'd0', date: d, moved: 0 })), log,
    expenses: mem.exp || [], perms: Object.assign({ discount: false, refund: true, editBill: false, money: false }, cf.perms || {}), boxes: Object.assign({ r_appt: true, r_close: true, d_sets: true, p_reports: true, p_pay: false }, cf.boxes || {}),
    msgs: null, named: {}, tokNext: (q.seq || 0) + 1, status: 'Live', tpl: cf.type || 'skin', callBy: S.callBy === 'reception' ? 'reception' : 'doctor', upi: S.upiId || '', bot: S.botNumber || '', links: { tv: S.tvKey ? `${APP}?v=tv&k=${S.tvKey}` : '' }
  };
  return { ver: 'live', today: todayStr, clock: now.hour * 60 + now.minute, active: 'live', clinics: { live: clinic }, dayClosed: (mem.close || {})[todayStr] ? { live: v8min((mem.close[todayStr] || {}).at) } : {}, patientAuth: {}, me: { name: sess.name, role, phone: v8ph10(sess.phone) } };
}
function v8act(b, sess, role, isDoc, out, res) {
  const a = String(b.action || ''); const by = sess.name || 'Staff'; const q = qWrite(); const cf = v8cfg();
  const findTk = key => q.list.find(x => x.key === key);
  const ownerOnly = role === 'owner'; const docOnly = isDoc;
  const fail = m => { res.error = m; };
  if (a === 'v8_register') {
    const full = v8full(b.phone); if (full && full.length !== 12) return fail('Enter a 10-digit mobile number.');
    const name = String(b.name || '').trim().slice(0, 40); if (!name) return fail('Write the patient name.');
    if (q.list.some(t => t.phone && t.phone === full && ['w', 's'].includes(t.st))) return fail('This number already has a token today.');
    const tk = issueToken(q, full, name, 'desk'); tk.kind = ['new', 'follow', 'proc'].includes(b.kind) ? b.kind : 'new'; if (b.prob) tk.prob = String(b.prob).slice(0, 120); if (b.tr) tk.tr = String(b.tr).slice(0, 60);
    const pk = patKey(full, name); const inf = v8pinfo(pk); if (b.age) inf.age = Math.max(0, Math.min(120, Number(b.age) || 0)); if (b.sex) inf.sex = String(b.sex).slice(0, 1); inf.name = name;
    if (b.src && !(mem.src || {})[full || ('n' + name.toLowerCase())]) { if (!mem.src) mem.src = {}; const sk = Object.keys(V8_SRC).find(k => V8_SRC[k] === b.src) || 'other'; mem.src[full || ('n' + name.toLowerCase())] = { s: sk, at: now.toISO() }; bump('src_' + sk); }
    if (b.mode && b.mode !== 'later' && Array.isArray(b.items) && b.items.length) { const v = v8ensureVisit(tk); v8bill(v, b.items, String(b.mode).toLowerCase(), 0, by, true, out); }
    if (b.mode === 'later') tk.payLater = true;
    if (full && inWindow(full)) out.push(tokenMsg(q, tk, full));
    res.added = tk.tok; res.key = tk.key; res.sent = !!(full && inWindow(full)); res.ahead = aheadOf(q, tk);
  } else if (a === 'v8_pay') {
    let v = null; if (b.day && b.k) v = v8visit(b.day, b.k); if (!v && b.key) { const tk = findTk(b.key); if (tk) v = v8ensureVisit(tk); }
    if (!v && b.pid) { // a bill for someone not in today's queue (medicines, procedure)
      const ph = b.pid[0] === 'p' ? b.pid.slice(1) : ''; const nm = (b.name || '').trim() || ((mem.pinfo || {})[b.pid] || {}).name || 'Patient';
      if (!mem.vis) mem.vis = {}; const l = mem.vis[todayStr] || (mem.vis[todayStr] = []); v = { k: rid(10), tok: '', name: nm, ph, tin: now.toISO(), in: now.toISO(), out: now.toISO(), fee: null, m: null, fupSug: 0, prob: '', counter: true }; l.push(v); }
    if (!v) return fail('This visit was not found.');
    if (v.m && !b.edit) return fail('Already paid. Open the bill to change it.');
    if (Number(b.disc) > 0 && !(cf.perms || {}).discount && !isDoc) return fail('Discounts are turned off by the owner.');
    v8bill(v, b.items, String(b.mode || 'cash').toLowerCase(), b.disc, by, b.wa !== false, out); res.billed = invNo(v);
    const tk = findTk(v.k); if (tk) tk.payLater = false;
  } else if (a === 'v8_refund') {
    const v = v8visit(b.day, b.k); if (!v || !v.m) return fail('Bill not found.');
    if (!isDoc && (cf.perms || {}).refund === false) return fail('Refunds are turned off by the owner.');
    const amt = Math.max(1, Math.min(v.fee || 0, Math.round(Number(b.amt) || 0))); const why = String(b.reason || '').trim().slice(0, 120); if (!why) return fail('Write the reason.');
    v.refund = { amt, reason: why, by, date: todayStr, time: now.hour * 60 + now.minute };
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: b.day, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: v.fee - amt, m: v.m }, what: 'Refunded ' + rupees(amt) + ' on ' + invNo(v) + ' (' + v.name + ')', why }]).slice(-400);
    if (v.ph && inWindow(v.ph)) out.push(textTo(v.ph, `${rupees(amt)} refunded for invoice ${invNo(v)}. If you paid by UPI, it reaches your account in 2–3 days.`));
  } else if (a === 'v8_mode') {
    if (!isDoc && !(cf.perms || {}).editBill) return fail('Bill changes are turned off by the owner.');
    const v = v8visit(b.day, b.k); if (!v || !v.m) return fail('Bill not found.'); const m = String(b.m || '').toLowerCase(); if (!['cash', 'upi', 'card'].includes(m) || m === v.m) return;
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: b.day, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: v.fee, m } }]).slice(-400); v.m = m; v.edited = (v.edited || 0) + 1;
  } else if (a === 'v8_next') {
    if (role === 'reception' && S.callBy !== 'reception' && !b.force) return fail('In this clinic the doctor calls the next patient. Use "Send in" only if the doctor asked.');
    const cur = servingOf(q); if (cur && !b.finishCur) return fail('CABIN_BUSY');
    if (!mem.docPend && ['late', 'away'].includes(docRead().status)) return fail(S.doctorName + ' has stepped out.');
    if (b.key) { const tk = findTk(b.key); if (tk && tk.st === 'w') { const rest = q.list.filter(x => x !== tk); const i = rest.findIndex(x => x.st === 'w'); rest.splice(i < 0 ? rest.length : i, 0, tk); q.list = rest; } }
    callNext(q, out); const nx = servingOf(q); if (nx) { nx.started = now.hour * 60 + now.minute; res.sentIn = nx.tok; }
  } else if (a === 'v8_start') {
    if (!isDoc) return fail('Only the doctor starts a consult.');
    const tk = b.key ? findTk(b.key) : waitingOf(q)[0]; const cur = servingOf(q);
    if (cur && (!tk || cur.key === tk.key)) { res.key = cur.key; return; }
    if (!tk || tk.st !== 'w') return fail('No one is waiting.');
    if (cur) { cur.st = 'w'; cur.calledAt = null; }
    tk.st = 's'; tk.calledAt = now.toISO(); tk.started = now.hour * 60 + now.minute; queueNotify(q, out); res.key = tk.key;
    if (['late', 'away'].includes(docRead().status)) setDoc('in', 0, out);
  } else if (a === 'v8_finish') {
    if (!isDoc) return fail('Only the doctor finishes a consult.');
    const r0 = b.rx || {}; const cur = b.key ? findTk(b.key) : servingOf(q);
    const pk = cur ? patKey(cur.phone, cur.name) : String(b.pid || ''); if (!pk) return fail('Patient not found.');
    const rec = { id: rid(8), date: todayStr, doc: 'd0', finding: String(r0.finding || '').slice(0, 160), meds: (Array.isArray(r0.meds) ? r0.meds : []).slice(0, 15).map(m => ({ n: String(m.n || '').slice(0, 80), how: String(m.how || '').slice(0, 120), brand: m.brand ? String(m.brand).slice(0, 40) : undefined })).filter(m => m.n), advice: String(r0.advice || '').slice(0, 400), vitals: { wt: String((r0.vitals || {}).wt || '').slice(0, 6), bp: String((r0.vitals || {}).bp || '').slice(0, 9) }, tests: (r0.tests || []).slice(0, 10).map(t => String(t).slice(0, 60)), follow: /^\d{4}-\d{2}-\d{2}$/.test(r0.follow || '') ? r0.follow : null };
    if (!mem.rx) mem.rx = {}; mem.rx[pk] = (mem.rx[pk] || []).concat([rec]).slice(-30);
    if (rec.vitals.wt) v8pinfo(pk).wt = rec.vitals.wt;
    if (cur && cur.st === 's') { cur.fupDays = rec.follow ? Math.round(DateTime.fromISO(rec.follow).diff(now.startOf('day'), 'days').days) : 0; finishCur(q, out);
      const v = v8visit(todayStr, cur.key); if (v) { v.prob = v.prob || rec.finding; if (rec.follow) { v.fup = rec.follow; mem.fup = (mem.fup || []).filter(f => f.k !== v.k); if (v.ph) mem.fup.push({ k: v.k, ph: v.ph, name: v.name, date: rec.follow, sent: false }); } } }
    else if (!cur) { if (!mem.vis) mem.vis = {}; const l = mem.vis[todayStr] || (mem.vis[todayStr] = []); const ph = pk[0] === 'p' ? pk.slice(1) : ''; l.push({ k: rid(10), tok: 'Rx', name: (v8pinfo(pk).name) || b.name || 'Patient', ph, tin: now.toISO(), in: now.toISO(), out: now.toISO(), fee: null, m: 'free', fupSug: 0, prob: rec.finding, rxOnly: true }); }
    const ph2 = pk[0] === 'p' ? pk.slice(1) : '';
    if (ph2 && inWindow(ph2)) out.push(ctaTo(ph2, (langOf(ph2, '') === 'en' ? `💊 *Your prescription from ${S.doctorName} is ready.*\n\nTap below to see your medicines and how to take them.` : `💊 *${S.doctorName} ki parchi taiyaar hai.*\n\nDawai aur lene ka tareeka dekhne ke liye neeche tap karein.`), langOf(ph2, '') === 'en' ? 'View prescription' : 'Parchi dekhein', `${APP}?v=p&k=${rec.id}.${sha256(pk + rec.id).slice(0, 10)}`));
    res.rx = rec.id;
  } else if (a === 'v8_left') {
    const tk = findTk(b.key); if (!tk) return fail('Token not found.'); tk.st = 'x';
    if (b.refund) { const v = v8visit(todayStr, tk.key); if (v && v.m) { v.refund = { amt: v.fee, reason: 'Left before seeing the doctor', by, date: todayStr, time: now.hour * 60 + now.minute }; mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: v.k, inv: v.inv, name: v.name, from: { fee: v.fee, m: v.m }, to: { fee: 0, m: v.m }, what: 'Refunded ' + rupees(v.fee) + ' (' + v.name + ' left)', why: 'Left before seeing the doctor' }]); } }
    queueNotify(q, out);
  } else if (a === 'v8_back_q') { const tk = findTk(b.key); if (tk && tk.st === 's') { tk.st = 'w'; tk.calledAt = null; } }
  else if (a === 'v8_moveend') { const tk = findTk(b.key); if (tk && tk.st === 'w') { q.list = q.list.filter(x => x !== tk).concat([tk]); tk.told2 = false; queueNotify(q, out); } }
  else if (a === 'v8_arrived') { const tk = findTk(b.key); if (tk) { tk.here = true; if (tk.phone && inWindow(tk.phone)) out.push(tokenMsg(q, tk, tk.phone)); } }
  else if (a === 'v8_pinfo') { const pk = String(b.pid || ''); if (!pk) return; const inf = v8pinfo(pk); const p = b.p || {}; if (p.name) inf.name = String(p.name).slice(0, 40); if (p.age !== undefined) inf.age = Math.max(0, Math.min(120, Number(p.age) || 0)); if (p.sex) inf.sex = String(p.sex).slice(0, 1); if (p.rel !== undefined) inf.rel = String(p.rel).slice(0, 40); if (p.allergies !== undefined) inf.allergies = String(p.allergies).slice(0, 80); }
  else if (a === 'v8_out') { if (!isDoc && role !== 'reception') return; const mins = Math.max(5, Math.min(240, Number(b.mins) || 30)); const cur = servingOf(q); if (cur) { cur.st = 'w'; cur.calledAt = null; } const n = setDoc('away', mins, out); mem.doc.reason = String(b.reason || 'Stepped out').slice(0, 40); res.told = n; }
  else if (a === 'v8_in') { res.told = setDoc('in', 0, out); }
  else if (a === 'v8_docstatus') { const s0 = b.status === 'gone' ? 'leave' : b.status === 'later' ? 'late' : 'in'; if (s0 === 'in') setDoc('in', 0, out); else mem.doc = { status: s0, mins: 0, setAt: now.toISO(), told: [] }; }
  else if (a === 'v8_more') { const d = docRead(); if (d.until) { d.until = DateTime.fromISO(d.until).plus({ minutes: 15 }).toISO(); d.mins = (d.mins || 0) + 15; } }
  else if (a === 'v8_leave') { if (!isDoc) return fail('Only the doctor can mark leave.'); const d0 = String(b.date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return; mem.leaves = (mem.leaves || []).filter(x => x !== d0); if (b.on !== false) mem.leaves.push(d0);
    let told = 0; if (b.on !== false) { for (const r of rows.filter(r => r.date === d0 && active(r))) if (inWindow(r.phone)) { out.push(textTo(r.phone, (langOf(r.phone, '') === 'en' ? `${S.doctorName} is on leave on ${DateTime.fromISO(d0).toFormat('ccc d LLL')}. Sorry! Please reply *NEW* to pick another time.` : `${S.doctorName} ${DateTime.fromISO(d0).toFormat('ccc d LLL')} ko chhutti par hain. Kshama karein! Naya samay chunne ke liye *NEW* likhiye.`))); told++; } for (const a2 of (mem.appts || []).filter(x => x.date === d0)) { if (a2.phone && inWindow(a2.phone)) { out.push(textTo(a2.phone, `${S.doctorName} is on leave on ${DateTime.fromISO(d0).toFormat('ccc d LLL')}. We will call you to move your visit.`)); told++; } } }
    res.told = told; }
  else if (a === 'v8_timings') { if (!isDoc) return; const ok = t => /^\d{2}:\d{2}$/.test(t); if (ok(b.open) && ok(b.close) && b.close > b.open) { const days0 = cf.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']; const H = {}; ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(d => { H[d] = days0.includes(d) ? [`${b.open}-${b.close}`] : []; }); cf.hours = H; cf.open = b.open; cf.close = b.close; cf.days = days0; Object.assign(S, cf); } else fail('End time must be after start time.'); }
  else if (a === 'v8_cb') { const ph = v8full(b.phone); const r0 = b.r;
    if (String(b.id || '').startsWith('mc:')) { if (r0 !== 'noans') mem.mcalls = (mem.mcalls || []).filter(x => x.ph !== ph); ev(ph, r0 === 'noans' ? 'noans' : 'done', r0 === 'noans' ? 'No answer · ' + by : 'Called back by ' + by); }
    else { const cb = (mem.callbacks || []).find(x => x.phone === ph); if (!cb) return;
      if (r0 === 'noans') { cb.noans = (cb.noans || 0) + 1; cb.tryAt = null; ev(ph, 'noans', 'No answer · ' + by + ' will try again'); }
      else { ev(ph, 'done', 'Talked · called back by ' + by); if (!mem.cbLog) mem.cbLog = []; mem.cbLog.push({ ph, at: cb.at, done: now.toISO(), by, reason: cb.reason || '' }); mem.cbLog = mem.cbLog.slice(-300); mem.callbacks = mem.callbacks.filter(x => x !== cb); } } }
  else if (a === 'v8_appt_add') { const full = v8full(b.phone); const name = String(b.name || '').trim().slice(0, 40); if (!name) return fail('Write the name.'); if (full && full.length !== 12) return fail('Enter a 10-digit mobile number.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !(Number(b.time) >= 0)) return fail('Pick a day and time.');
    if ((mem.leaves || []).includes(b.date)) return fail('The doctor is on leave that day.');
    if (b.moving) { if (String(b.moving).startsWith('s')) { if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[b.moving] = 1; } else mem.appts = (mem.appts || []).filter(x => x.id !== b.moving); }
    const pk = b.pid || patKey(full, name); const ap = { id: 'a' + rid(8), date: b.date, time: Number(b.time), pid: pk, name, phone: full, src: b.src || 'Reception', by, at: now.toISO() };
    mem.appts = (mem.appts || []).filter(x => x.date >= todayStr).concat([ap]).slice(-500); v8pinfo(pk).name = v8pinfo(pk).name || name;
    if (full && inWindow(full)) out.push(textTo(full, (langOf(full, '') === 'en' ? `📅 *Booked:* ${S.doctorName}, ${DateTime.fromISO(b.date).toFormat('ccc d LLL')} at ${DateTime.fromFormat(v8hm(ap.time), 'HH:mm').toFormat('h:mm a')}.\n${C}` : `📅 *Booking ho gayi:* ${S.doctorName}, ${DateTime.fromISO(b.date).toFormat('ccc d LLL')} ko ${DateTime.fromFormat(v8hm(ap.time), 'HH:mm').toFormat('h:mm a')} baje.\n${C}`)));
    res.appt = ap.id; }
  else if (a === 'v8_appt_cancel') { const id = String(b.id || ''); let ph = '';
    if (id.startsWith('s')) { if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[id] = 1; const r = rows.find(x => 's' + x.row_number === id); ph = r ? r.phone : ''; }
    else { const ap = (mem.appts || []).find(x => x.id === id); if (ap) ph = ap.phone; mem.appts = (mem.appts || []).filter(x => x.id !== id); }
    if (ph && inWindow(ph)) out.push(textTo(ph, `Your appointment at ${C} is cancelled. Reply *NEW* any time to book again.`)); }
  else if (a === 'v8_appt_arrived') { const id = String(b.id || ''); let name = 'Patient', ph = '';
    if (id.startsWith('s')) { const r = rows.find(x => 's' + x.row_number === id); if (r) { name = r.name || name; ph = r.phone; } if (!mem.apptHide) mem.apptHide = {}; mem.apptHide[id] = 1; }
    else { const ap = (mem.appts || []).find(x => x.id === id); if (ap) { name = ap.name; ph = ap.phone; ap.done = true; } }
    const tk = issueToken(q, ph, name, 'desk'); tk.here = true; tk.kind = seenBefore(ph) ? 'follow' : 'new'; if (ph && inWindow(ph)) out.push(tokenMsg(q, tk, ph)); res.added = tk.tok; }
  else if (a === 'v8_petty') { const amt = Math.round(Number(b.amt) || 0); if (amt <= 0 || amt > 50000) return fail('Enter the amount.'); mem.exp = (mem.exp || []).concat([{ id: rid(8), date: todayStr, time: now.hour * 60 + now.minute, amt, what: String(b.what || 'Other').slice(0, 40), from: 'drawer', by }]).slice(-3000);
    mem.edits = (mem.edits || []).concat([{ at: now.toISO(), by, day: todayStr, k: '', inv: 0, name: '', from: { fee: 0, m: 'cash' }, to: { fee: 0, m: 'cash' }, what: 'Took ' + rupees(amt) + ' from the drawer', why: String(b.what || '') }]).slice(-400); }
  else if (a === 'v8_close') { const R = regSum(todayStr, todayStr); const fl = Number(cf.float == null ? 2000 : cf.float) || 0; const petty = (mem.exp || []).filter(e => e.date === todayStr && e.from === 'drawer').reduce((x, e) => x + e.amt, 0);
    const expected = fl + R.cash - (R.V.filter(v => v.m === 'cash' && v.refund).reduce((x, v) => x + v.refund.amt, 0)) - petty; const counted = Math.max(0, Math.round(Number(b.counted) || 0)); const diff = counted - expected;
    if (diff !== 0 && !String(b.note || '').trim()) return fail('Write why the cash is ' + (diff < 0 ? 'short.' : 'extra.'));
    if (!mem.close) mem.close = {}; mem.close[todayStr] = { cash: counted, upi: R.upi, by, at: now.toISO(), v8: true, expected, note: String(b.note || '').slice(0, 160), handed: Math.max(0, counted - fl), notes: b.notes || null, checked: diff === 0 };
    for (const o of OWNERS) if (inWindow(o.phone) && o.phone !== sess.phone) out.push(textTo(o.phone, `📒 *Day closed* by ${by} at ${now.toFormat('h:mm a')}\nCollected: ${rupees(R.money - R.V.reduce((x, v) => x + (v.refund ? v.refund.amt : 0), 0))} (cash ${rupees(R.cash)}, UPI ${rupees(R.upi)})\nCash: ${diff === 0 ? 'matched ✅' : (diff < 0 ? 'SHORT ' : 'extra ') + rupees(Math.abs(diff)) + (b.note ? ' · "' + String(b.note).slice(0, 80) + '"' : '')}\nHand over: ${rupees(Math.max(0, counted - fl))}\nPatients seen: ${R.V.filter(v => v.out).length}`));
    res.closed = true; }
  else if (a === 'v8_reopen') { if (mem.close) delete mem.close[todayStr]; }
  else if (a === 'v8_cash_ok') { if (!ownerOnly) return fail('Only the owner can mark this.'); const c = (mem.close || {})[b.date]; if (c) c.checked = true; }
  else if (a === 'v8_sets') { if (!isDoc) return; cf.rxsets = (Array.isArray(b.sets) ? b.sets : []).slice(0, 80).map(s => ({ id: String(s.id || rid(6)).slice(0, 12), n: String(s.n || '').slice(0, 50), used: Number(s.used) || 0, meds: (s.meds || []).slice(0, 12).map(m => ({ n: String(m.n || '').slice(0, 80), how: String(m.how || '').slice(0, 120), brand: m.brand ? String(m.brand).slice(0, 40) : undefined })) })).filter(s => s.n); }
  else if (a === 'v8_rep_seen') { const r = (mem.preports || []).find(x => x.id === b.id); if (r) r.seen = true; if (b.reply && r) { const ph = r.pid[0] === 'p' ? r.pid.slice(1) : ''; if (ph && inWindow(ph)) out.push(textTo(ph, S.doctorName + ': ' + String(b.reply).slice(0, 300))); } }
  else if (a === 'v8_remind') { const pk = String(b.pid || ''); const ph = pk[0] === 'p' ? pk.slice(1) : ''; if (ph && inWindow(ph)) { out.push(textTo(ph, (langOf(ph, '') === 'en' ? `Hello, your follow-up with ${S.doctorName} is due. Reply *NEW* to book a time.` : `Namaste, ${S.doctorName} se follow-up ka samay ho gaya hai. Booking ke liye *NEW* likhiye.`))); res.sent = true; } else res.error = 'This patient has not messaged in the last 24 hours, so WhatsApp only allows an approved template. Ask reception to call instead.'; v8pinfo(pk).asked = todayStr; }
  else if (a === 'v8_askcall') { const pk = String(b.pid || ''); const ph = pk[0] === 'p' ? pk.slice(1) : ''; if (!ph) return; if (!mem.callbacks) mem.callbacks = []; if (!mem.callbacks.some(c => c.phone === ph)) mem.callbacks.push({ phone: ph, name: b.name || '', at: now.toISO(), reason: by + ' asked: follow-up is due', pinged: now.toISO() }); v8pinfo(pk).asked = todayStr; }
  else if (a === 'v8_exp') { if (!ownerOnly) return fail('Only the owner adds expenses.'); const amt = Math.round(Number(b.amt) || 0); if (amt <= 0) return fail('Enter the amount.'); mem.exp = (mem.exp || []).concat([{ id: rid(8), date: /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : todayStr, time: 600, amt, what: String(b.what || 'Other').slice(0, 60), from: 'bank', by }]); }
  else if (a === 'v8_exp_del') { if (!ownerOnly) return; mem.exp = (mem.exp || []).filter(x => x.id !== b.id); }
  else if (a === 'v8_ref') { if (!ownerOnly) return; if (b.id) { const r = (mem.refs || []).find(x => x.id === b.id); if (r) { r.paid = !r.paid; r.paidOn = r.paid ? todayStr : null; } } else { const amt = Math.round(Number(b.amt) || 0); if (!String(b.name || '').trim() || amt <= 0) return fail('Fill name and amount.'); mem.refs = (mem.refs || []).concat([{ id: rid(8), name: String(b.name).slice(0, 60), what: String(b.what || '').slice(0, 60), amt, paid: false, month: now.toFormat('yyyy-MM') }]); } }
  else if (a === 'v8_perm') { if (!ownerOnly) return fail('Only the owner can change this.'); cf.perms = Object.assign({ discount: false, refund: true, editBill: false, money: false }, cf.perms || {}); if (b.k in cf.perms) cf.perms[b.k] = !cf.perms[b.k]; }
  else if (a === 'v8_box') { if (!ownerOnly) return; cf.boxes = Object.assign({ r_appt: true, r_close: true, d_sets: true, p_reports: true, p_pay: false }, cf.boxes || {}); if (b.k in cf.boxes) cf.boxes[b.k] = !cf.boxes[b.k]; }
  else if (a === 'v8_cfg') { if (!ownerOnly && !isDoc) return fail('Only the owner can change settings.'); const c0 = b.cfg || {}; const str = (v, n) => String(v || '').trim().slice(0, n);
    if (c0.name) { cf.clinicName = str(c0.name, 60); S.clinicName = cf.clinicName; } if (c0.logo) cf.logo = str(c0.logo, 2).toUpperCase(); if (c0.color && /^#[0-9A-Fa-f]{6}$/.test(c0.color)) cf.color = c0.color;
    if (c0.timings !== undefined) cf.timings = str(c0.timings, 120); if (c0.rxLang && ['hi', 'hl', 'en'].includes(c0.rxLang)) cf.rxLang = c0.rxLang; if (c0.lang && ['en', 'hl'].includes(c0.lang)) { cf.defaultLang = c0.lang; S.defaultLang = c0.lang; }
    if (c0.fee !== undefined) { cf.fee = Math.max(0, Math.min(100000, Math.round(Number(c0.fee) || 0))); S.fee = cf.fee; } if (c0.freeDays !== undefined) { cf.followFreeDays = Math.max(0, Math.min(90, Number(c0.freeDays) || 0)); S.followFreeDays = cf.followFreeDays; }
    if (c0.float !== undefined) cf.float = Math.max(0, Math.min(50000, Math.round(Number(c0.float) || 0)));
    if (c0.address !== undefined) { cf.address = str(c0.address, 120); S.address = cf.address; }
    if (c0.biz) { const z = c0.biz; const g = String(z.gstin || '').toUpperCase().replace(/\s/g, ''); if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return fail('GSTIN should be 15 characters, like 09ABCDE1234F1Z5.'); cf.biz = Object.assign({}, cf.biz || {}, { gstin: g }, z.prefix ? { prefix: str(z.prefix, 4).toUpperCase().replace(/[^A-Z]/g, '') } : {}, z.phone !== undefined ? { phone: str(z.phone, 20) } : {}); }
    if (c0.doc) { const z = c0.doc; cf.docp = Object.assign({}, cf.docp || {}, { qual: str(z.deg, 80), reg: str(z.reg, 40), council: str(z.council, 60), spec: str(z.spec, 40) }); if (z.name) { cf.doctorName = str(z.name, 60); S.doctorName = cf.doctorName; } }
    if (Array.isArray(c0.treatments)) cf.bill = c0.treatments.map(x => ({ n: str(x.n, 40), p: Math.max(0, Math.min(500000, Math.round(Number(x.p) || 0))), g: [0, 5, 12, 18].includes(Number(x.gst)) ? Number(x.gst) : 0 })).filter(x => x.n).slice(0, 40);
    Object.assign(S, cf); res.saved = true; }
  else if (a === 'v8_preport') { /* patient page upload (name only for now) */ const pk = String(b.pid || ''); if (!pk) return; mem.preports = (mem.preports || []).concat([{ id: rid(8), pid: pk, name: String(b.name || 'Report').slice(0, 60), date: todayStr, time: now.hour * 60 + now.minute, seen: false, values: [['File', String(b.name || '').slice(0, 60), 'Waiting for the doctor']] }]).slice(-300); }
  else if (a === 'v8_staff') { if (!ownerOnly) return fail('Only the owner adds staff.'); let ph = v8full(b.phone); if (ph.length !== 12) return fail('Enter a 10-digit mobile number.'); const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || [])).filter(x => String(x.phone).slice(-10) !== ph.slice(-10)); T.push({ phone: ph, name: String(b.name || 'Staff').trim().slice(0, 40) || 'Staff', role: ['reception', 'doctor'].includes(b.role) ? b.role : 'reception' }); mem.team = T; S.staff = T; res.added = true; }
  else if (a === 'v8_staff_rm') { if (!ownerOnly) return; const ph = v8ph10(b.phone); const T = (Array.isArray(mem.team) && mem.team.length ? mem.team : (S.staff || [])); const x = T.find(y => String(y.phone).slice(-10) === ph); if (!x || x.role === 'owner') return fail('This person can not be removed.'); mem.team = T.filter(y => y !== x); S.staff = mem.team; for (const k of Object.keys(mem.sess || {})) if (mem.sess[k].phone.slice(-10) === ph) delete mem.sess[k]; }
}
