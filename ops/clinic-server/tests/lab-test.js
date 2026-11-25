process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
const t = DateTime.now().setZone('Asia/Kolkata').set({ hour: 11, minute: 0 }); Settings.now = () => t.toMillis();
const { run, mem, S } = require('/home/claude/clinic-server/mockserver.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const REC = '918002187717', P = '919811177001';
mem.vis = { [t.toFormat('yyyy-MM-dd')]: [{ k: 'a', name: 'Sunita Devi', ph: P, fee: 500, m: 'upi' }] };
const send = (from, cap) => run('chat', { from, name: 'X', type: 'document', text: cap, replyId: '', media: { id: 'MEDIA1', mime: 'application/pdf', filename: 'cbc.pdf', kind: 'document' } });
let o = send(REC, ''); ok(o.payload && /mobile number in the caption/.test(o.payload.text.body), 'asks for number'); ok(!o.labfwd, 'no fwd');
o = send(REC, '9811177001'); ok(o.payload && /Could not send yet/.test(o.payload.text.body), 'not in window, no template');
run('chat', { from: P, name: 'Sunita', type: 'text', text: 'Hi', replyId: '' });
o = send(REC, 'cbc report 98111 77001'); ok(o.labfwd && o.labfwd.to === P && o.labfwd.media === 'MEDIA1' && !o.labfwd.template, 'fwd in window'); ok(/Sunita/.test(o.payload.text.body), 'staff told name');
console.log(o.labfwd && o.labfwd.caption.slice(0, 80));
S.templates = { report: 'report_ready' }; mem.seen = {}; mem.last = {};
const o2 = send(REC, '+91 99999 00000'); ok(o2.labfwd && o2.labfwd.template === 'report_ready', 'template when out of window');
// patient sending a document is not forwarded
const o3 = run('chat', { from: P, name: 'S', type: 'document', text: '9811100001', replyId: '', media: { id: 'M2', kind: 'document' } }); ok(!o3.labfwd, 'patient doc not forwarded');
console.log(fail ? 'FAILED ' + fail : 'ALL PASS', pass);
