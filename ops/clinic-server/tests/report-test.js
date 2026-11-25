process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
let t = DateTime.fromISO('2026-12-01T10:05:00', { zone: 'Asia/Kolkata' }); Settings.now = () => t.toMillis();
const { run, mem } = require('/home/claude/clinic-server/mockserver.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const msgs = o => [o && o.payload].concat((o && o.more) || []).filter(Boolean);
const body = m => (m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || '';
// November data
mem.st = { '2026-11-05': { mcalls: 10, mcBooked: 4, booked: 12, bookedNight: 3, reminders: 20, confirmed: 15, recalls: 6, recallBack: 2, recallMoney: 1500, rvGood: 5, rvMid: 1 }, '2026-11-20': { mcalls: 6, mcBooked: 2, booked: 8 } };
mem.vis = { '2026-11-05': [{ k: 'a', name: 'A', ph: '919811100001', fee: 500, m: 'upi', in: '2026-11-05T10:00:00+05:30', out: '2026-11-05T10:10:00+05:30' }, { k: 'b', name: 'B', ph: '919811100002', fee: 700, m: 'cash', in: '2026-11-05T11:00:00+05:30', out: '2026-11-05T11:10:00+05:30' }] };
// owner wrote recently -> inside 24h window
mem.ev = mem.ev || {}; mem.last = mem.last || {};
run('chat', { from: '917903568856', name: 'Alok', type: 'text', text: 'TODAY', replyId: '' });
const o = run('summary', {});
const M = msgs(o).filter(m => String(m.to) === '917903568856');
const rep = M.map(body).find(x => /Extra income|extra kamaai/i.test(x));
ok(!!rep, 'owner got monthly report'); if (rep) console.log(rep.slice(0, 700));
ok(rep && /November 2026/.test(rep), 'month label');
ok(rep && /6,900/.test(rep), 'extra = (6+3)*600+1500'); 
ok(mem.monthSent === '2026-12', 'marked sent');
const o2 = run('summary', {}); ok(!msgs(o2).some(m => /Extra income|extra kamaai/i.test(body(m))), 'not sent twice');
// REPORT command
t = DateTime.fromISO('2026-12-10T12:00:00', { zone: 'Asia/Kolkata' });
const r3 = run('chat', { from: '917903568856', name: 'Alok', type: 'text', text: 'report', replyId: '' });
ok(msgs(r3).some(m => /so far/.test(body(m))), 'REPORT command works');
// patient typing report is not given the report
const r4 = run('chat', { from: '919811100009', name: 'P', type: 'text', text: 'report', replyId: '' });
ok(!msgs(r4).some(m => /Extra income|extra kamaai/i.test(body(m))), 'patient does not get report');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS', pass);
