process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
let t = DateTime.now().setZone('Asia/Kolkata').set({ hour: 12, minute: 0 }); Settings.now = () => t.toMillis();
const { run, mem } = require('/home/claude/clinic-server/mockserver.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const msgs = o => [o && o.payload].concat((o && o.more) || []).filter(Boolean);
const body = m => (m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || '';
const ids = m => { const i = m.interactive; return i && i.action && i.action.buttons ? i.action.buttons.map(b => b.reply.id) : []; };
const REC = '918002187717', P = '919811188001', P2 = '919811188002';
const say = (from, text, replyId) => run('chat', { from, name: 'X', type: replyId ? 'interactive' : 'text', text: text || '', replyId: replyId || '' });
const d0 = t.toFormat('yyyy-MM-dd'); mem.vis = { [d0]: [{ k: 'a', name: 'Kavya Nair', ph: P, fee: 500, m: 'upi' }] };
let o = say(REC, 'QUOTE 98111 88001 Implant 40,000'); ok(/Quote saved: Kavya Nair · Implant · ₹40,000/.test(body(o.payload)), 'saved: ' + body(o.payload));
say(REC, 'quote +91 9811188002 hair PRP package 12000');
o = say(REC, 'QUOTES'); ok(/Open treatment quotes \(2\)/.test(body(o.payload)), 'list');
o = say('919800000000', 'QUOTE 9811188001 x 100'); ok(!/Quote saved/.test(body(o.payload || {})), 'patient cannot add');
// patient messages so in window
say(P, 'Hi'); say(P2, 'Hi');
const at = (days, h) => { t = DateTime.fromISO(d0, { zone: 'Asia/Kolkata' }).plus({ days }).set({ hour: h, minute: 5 }); };
at(1, 18); o = run('summary', {}); ok(!msgs(o).some(m => ids(m).some(x => x.startsWith('QB|'))), 'nothing on day 1');
at(2, 18); say(P, 'Hi'); say(P2, 'Hi'); at(2, 18); o = run('summary', {}); const M = msgs(o).filter(m => ids(m).some(x => x.startsWith('QB|')));
ok(M.length === 2, 'day 2 reminders x2'); console.log(body(M[0]).slice(0, 120));
o = run('summary', {}); ok(!msgs(o).some(m => ids(m).some(x => x.startsWith('QB|'))), 'not twice same stage');
// P2 says not now
const q2 = mem.quotes.find(q => q.ph === P2); o = say(P2, 'Not now', 'QN|' + q2.id); ok(q2.done === 'no' && /not remind|dobara yaad/.test(body(o.payload)), 'not now');
// P books via button -> booking flow
const q1 = mem.quotes.find(q => q.ph === P); o = say(P, 'Book', 'QB|' + q1.id); ok(msgs(o).length > 0 && q1.tapped, 'book tap opens booking');
// P visits on day 5 -> won
mem.vis[DateTime.fromISO(d0).plus({ days: 5 }).toFormat('yyyy-MM-dd')] = [{ k: 'z', name: 'Kavya Nair', ph: P, fee: 40000, m: 'upi' }];
at(5, 18); run('summary', {}); ok(q1.done === 'won', 'won'); 
let T = {}; for (const d of Object.keys(mem.st)) for (const k of Object.keys(mem.st[d])) T[k] = (T[k] || 0) + mem.st[d][k];
ok(T.quoteWon === 1 && T.quoteMoney === 40000, 'counted won 40000');
at(7, 18); o = run('summary', {}); ok(!msgs(o).some(m => ids(m).some(x => x.startsWith('QB|'))), 'no reminders after won/no');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS', pass);
