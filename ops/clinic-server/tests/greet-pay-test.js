process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
const t = DateTime.now().setZone('Asia/Kolkata').set({ hour: 11, minute: 0 }); Settings.now = () => t.toMillis();
const { run, mem, sheet } = require('/home/claude/clinic-server/mockserver.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const msgs = o => [o && o.payload].concat((o && o.more) || []).filter(Boolean);
const body = m => (m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || (m.template && 'TPL ' + m.template.name) || '';
const ids = m => { const i = m.interactive; return i && i.action && i.action.buttons ? i.action.buttons.map(b => b.reply.id) : []; };
const OWN = '917903568856';
const say = (from, text, replyId) => run('chat', { from, name: 'X', type: replyId ? 'interactive' : 'text', text: text || '', replyId: replyId || '' });
// patients in data
mem.vis = { [t.toFormat('yyyy-MM-dd')]: [{ k: 'a', name: 'Riya Sharma', ph: '919811100001', fee: 500, m: 'upi' }, { k: 'b', name: 'Aman Gupta', ph: '919811100002', fee: 500, m: 'cash' }] };
say('919811100001', 'Hi'); // in window
mem.optout = { '919811100002': t.toISO() };
let o = say(OWN, 'GREET'); ok(msgs(o).some(m => ids(m).includes('GR|DIWALI')), 'greet menu'); 
o = say(OWN, 'Diwali', 'GR|DIWALI'); ok(msgs(o).some(m => ids(m).includes('BC|yes') && /Preview/.test(body(m))), 'preview');
o = say(OWN, 'Send', 'BC|yes'); const M = msgs(o);
ok(M.some(m => String(m.to) === '919811100001' && /Diwali|Deepawali/.test(body(m))), 'sent to patient');
ok(!M.some(m => String(m.to) === '919811100002'), 'opted-out skipped');
ok(M.some(m => /Done ✓ Greeting sent to/.test(body(m))), 'owner confirm'); console.log(M.map(m => m.to + ': ' + body(m).slice(0, 60)).join('\n'));
// limit
say(OWN, 'GREET'); say(OWN, 'x', 'GR|HOLI'); say(OWN, 'x', 'BC|yes'); say(OWN, 'GREET'); say(OWN, 'x', 'GR|NEWYEAR'); o = say(OWN, 'x', 'BC|yes');
ok(msgs(o).some(m => /Two greetings/.test(body(m))), 'monthly limit');
// patient cannot greet
o = say('919811100001', 'GREET happy diwali to everyone here'); ok(!msgs(o).some(m => /Preview/.test(body(m))), 'patient cannot broadcast');
// advance
o = say(OWN, 'ADVANCE 100'); ok(msgs(o).some(m => /₹100 advance/.test(body(m))), 'advance set'); ok(mem.cfg.advance === 100, 'cfg');
// patient books via FLOW
const d = t.plus({ days: 1 }).toFormat('yyyy-MM-dd');
const P = '919811155566'; say(P, 'Hi');
o = say(P, JSON.stringify({ d, time: '11:30', who: 'self', name: 'Ravi', age: 30, sex: 'Male' }), 'FLOW');
const M2 = msgs(o); const pay = M2.find(m => ids(m).some(x => x.startsWith('PAID|')));
ok(!!pay, 'pay ask sent after booking'); if (pay) console.log(body(pay).slice(0, 90), '|', pay.interactive.header && pay.interactive.header.image.link.slice(0, 80));
if (pay) { o = say(P, 'paid', ids(pay)[0]); ok(msgs(o).some(m => /Thank you|Dhanyavaad/.test(body(m))), 'paid thanks'); ok(Object.values(mem.adv || {}).some(a => a.ph === P), 'adv recorded'); }
o = say(OWN, 'ADVANCE OFF'); ok(mem.cfg.advance === 0, 'advance off');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS', pass);
