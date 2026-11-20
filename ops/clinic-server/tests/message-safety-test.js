process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
const at = h => { const t = DateTime.now().setZone('Asia/Kolkata').set({ hour: h, minute: 5 }); Settings.now = () => t.toMillis(); };
at(11);
const { run, mem } = require('/home/claude/clinic-server/mockserver.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const msgs = o => !o ? [] : [o.payload].concat(o.more || []).filter(Boolean);
const STAFF = ['917903568856', '918002187717', '919999999999'];
mem.sess = { SR: { phone: '918002187717', role: 'reception', name: 'Priya', exp: '2099-01-01' }, SD: { phone: '919999999999', role: 'doctor', name: 'Dr', exp: '2099-01-01' } };
// a patient writes in (opens the 24h window), takes a token, is seen and pays
run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'Hi', replyId: '' });
let o = run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'TOKEN', replyId: '' }); ok(msgs(o).length >= 1, 'day: patient chat reply goes');
run('desk', { sid: 'SR', action: 'v8_register', name: 'Ravi', phone: '9811100001', mode: 'cash', items: [{ n: 'Consultation', p: 600 }] });
// make the visit look finished 2 hours ago so the review ask is due
for (const d of Object.values(mem.vis || {})) for (const v of d) { v.out = DateTime.now().minus({ hours: 2 }).toISO(); v.in = v.out; v.m = v.m || 'cash'; }
mem.rv = {}; const td = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'); mem.vis = mem.vis || {}; (mem.vis[td] = mem.vis[td] || []).push({ k: 'zz1', tok: 'A-9', name: 'Ravi', ph: '919811100001', tin: DateTime.now().minus({ hours: 3 }).toISO(), in: DateTime.now().minus({ hours: 3 }).toISO(), out: DateTime.now().minus({ hours: 2 }).toISO(), fee: 600, m: 'cash' });
// 11 PM automatic run
at(23); const n0 = (mem.held || []).length;
o = run('summary', {}); const pat = msgs(o).filter(m => !STAFF.includes(String(m.to)));
ok(pat.length === 0, '11 PM: no automatic patient message (' + pat.length + ')');
ok((mem.held || []).length > n0, '11 PM: blocked ones listed for owner: ' + JSON.stringify((mem.held || []).slice(-2).map(h => h.why + ':' + h.what.slice(0, 30))));
// patient writes at 11 PM -> reply still goes
o = run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'Hi', replyId: '' }); ok(msgs(o).length >= 1, '11 PM: reply to a patient who wrote still goes');
// day: same reminder twice from the desk -> second blocked
at(12);
const r1 = run('desk', { sid: 'SR', action: 'v8_remind', pid: 'p919811100001' }); const r2 = run('desk', { sid: 'SR', action: 'v8_remind', pid: 'p919811100001' });
ok(msgs(r1).length === 1 && msgs(r2).length === 0, 'same message twice in 12 h: second blocked (' + msgs(r1).length + ',' + msgs(r2).length + ')');
// daily cap
let sentN = 0; for (let i = 0; i < 10; i++) { const x = run('desk', { sid: 'SD', action: 'v8_out', mins: 10 + i, reason: 'Emergency ' + i }); sentN += msgs(x).filter(m => String(m.to) === '919811100001').length; run('desk', { sid: 'SD', action: 'v8_in' }); }
ok(sentN <= 6, 'daily cap holds (' + sentN + ' to one patient)');
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
// night missed call -> nothing at night, template at 8 AM
at(23); const o1 = run('desk', { action: 'mc_log', key: 'hk', phone: '919811177777', send: false, sent: false, night: true });
ok(msgs(o1).length === 0, 'night missed call: nothing sent at night');
at(8); const o2 = run('summary', {}); const mm = msgs(o2).filter(m => String(m.to) === '919811177777');
ok(mm.length === 1, '8 AM: missed-call WhatsApp goes in the morning (' + mm.length + ')');
let o3 = {}; try { o3 = run('summary', {}); } catch (e) { o3 = {}; } ok(msgs(o3).filter(m => String(m.to) === '919811177777').length === 0, 'not sent twice');
console.log(fails ? fails + ' FAILED' : 'ALL PASS 2');
at(12); run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'STOP', replyId: '' });
const rs = run('desk', { sid: 'SR', action: 'v8_remind', pid: 'p919811100001' }); ok(msgs(rs).length === 0, 'after STOP: no automatic message');
const rr = run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'fees', replyId: '' }); ok(msgs(rr).length >= 1, 'after STOP: patient who writes still gets an answer');
run('chat', { from: '919811100001', name: 'Ravi', type: 'text', text: 'START', replyId: '' }); ok(!mem.optout['919811100001'], 'START turns messages back on');
console.log(fails ? fails + ' FAILED' : 'ALL PASS 3');
