process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
const t = DateTime.now().setZone('Asia/Kolkata').set({ hour: 11, minute: 0 }); Settings.now = () => t.toMillis();
const { run, mem, S, sheet } = require('/home/claude/clinic-server/mockserver.js');
S.services = [{"id":"consult","name":"Skin consultation","en":"Acne, rashes","hl":"x"},{"id":"hair","name":"Hair fall / PRP","en":"Hair fall","hl":"y"}];
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m)} else console.log('ok  ',m) };
const all = o => !o ? [] : [o.payload].concat(o.more || []).filter(Boolean);
const say = (P, text, id) => all(run('chat', { from: P, name: 'Ravi Kumar', type: id ? 'interactive' : 'text', text: text || '', replyId: id || '' }));
const txt = m => (m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || m.type;
const btnIds = m => m && m.interactive && m.interactive.action && m.interactive.action.buttons ? m.interactive.action.buttons.map(b => b.reply.id) : [];
const listIds = ms => { const ids = []; ms.forEach(m => { const i = m.interactive; if (i && i.action && i.action.sections) i.action.sections.forEach(s => s.rows.forEach(r => ids.push(r.id))); }); return ids; };
const toHeld = P => { say(P, 'Hi'); say(P, null, 'NEW'); const d = say(P, null, 'TR|consult'); const day = listIds(d).find(x => x.startsWith('D|')); const tl = say(P, null, day); return [say(P, null, listIds(tl).find(x => x.startsWith('S|'))), day]; };
// Hi
let h = say('919800000201', 'Hi'); ok(h.length === 1 && h[0].interactive.header && h[0].interactive.header.type === 'image' && btnIds(h[0]).join() === 'NEW,SVC,LIVE', 'Hi = ONE message: photo + welcome + 3 buttons');
ok(/What would you like to visit for\? Choose below/.test(txt(h[0])), 'welcome words are the old ones');
let n = say('919800000201', null, 'NEW'); ok(n[0].interactive && n[0].interactive.type === 'carousel', 'Book appointment -> photo cards');
// Myself path
let [held] = toHeld('919800000202'); ok(btnIds(held[0]).join() === 'SELF,OTHER', 'held -> Myself / Someone else buttons');
let r = say('919800000202', null, 'SELF'); ok(btnIds(r[0]).join() === 'SEX|Male,SEX|Female,SEX|Other', 'Myself -> gender buttons');
r = say('919800000202', null, 'SEX|Male'); ok(/age/.test(txt(r[0])), 'gender -> asks age (number)');
r = say('919800000202', '28'); ok(/booked/i.test(txt(r[0])) && /28 yrs, Male/.test(txt(r[0])) && r.some(m => m.type === 'document'), 'age -> booked + receipt: ' + txt(r[0]).split('\n').slice(2,3).join());
// Someone else path
[held] = toHeld('919800000203'); r = say('919800000203', null, 'OTHER'); ok(/full name/.test(txt(r[0])), 'Someone else -> asks name');
r = say('919800000203', 'riya sharma'); ok(/Riya Sharma/.test(txt(r[0])) && btnIds(r[0]).length === 3, 'name -> gender buttons');
r = say('919800000203', null, 'SEX|Female'); r = say('919800000203', '7 saal'); ok(/booked/i.test(txt(r[0])) && /Riya Sharma \(7 yrs, Female\)/.test(txt(r[0])), 'child booking done');
// one-line typed still works
toHeld('919800000204'); r = say('919800000204', 'Sunita Devi, 45, Female'); ok(/booked/i.test(txt(r[0])), 'one typed line still books');
// Form mode
S.bookFlowId = '123';
say('919800000205', 'Hi'); say('919800000205', null, 'NEW'); const dl = say('919800000205', null, 'TR|consult'); const day = listIds(dl).find(x => x.startsWith('D|'));
const fm = say('919800000205', null, day); const fl = fm[0].interactive; ok(fl && fl.type === 'flow' && fl.action.parameters.flow_action_payload.data.times.length > 3, 'form mode: day -> form with ' + (fl ? fl.action.parameters.flow_action_payload.data.times.length : 0) + ' time chips');
const dd = fl.action.parameters.flow_action_payload.data; const before = sheet.length;
r = say('919800000205', JSON.stringify({ d: dd.d, time: dd.times[1].id, svc: dd.svc, who: 'other', name: 'Kabir Khan', age: '41', sex: 'Male', area: 'Alpha 2', phone: '', prob: 'back pain' }), 'FLOW');
ok(/booked/i.test(txt(r[0])) && r.some(m => m.type === 'document') && sheet.length === before + 1 && sheet[sheet.length - 1].Status === 'Booked', 'form reply books in one go + receipt + sheet row');
r = say('919800000206', JSON.stringify({ d: dd.d, time: dd.times[1].id, who: 'self', name: 'X Y', age: '30', sex: 'Male' }), 'FLOW'); ok(fl && !/booked/i.test(txt(r[0])), 'same time twice -> "time just taken", pick again');
delete S.bookFlowId;
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
