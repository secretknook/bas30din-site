process.chdir('/home/claude/clinic-server');
const { Settings, DateTime } = require('/home/claude/clinic-server/node_modules/luxon');
const t = DateTime.now().setZone('Asia/Kolkata').set({ hour: 11, minute: 0 }); Settings.now = () => t.toMillis();
const { run, mem, S } = require('/home/claude/clinic-server/mockserver.js');
S.services = [{"id":"consult","name":"Skin consultation","en":"Acne, rashes","hl":"x"},{"id":"hair","name":"Hair fall / PRP","en":"Hair fall","hl":"y"}];
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('FAIL',m)} else console.log('ok  ',m) };
const all = o => !o ? [] : [o.payload].concat(o.more || []).filter(Boolean);
const say = (P, text, id) => all(run('chat', { from: P, name: 'Ravi Kumar', type: id ? 'interactive' : 'text', text: text || '', replyId: id || '' }));
const txt = m => (m.text && m.text.body) || (m.interactive && m.interactive.body && m.interactive.body.text) || m.type;
const slot = P => { const h = say(P, 'Hi'); const car = h.find(m => m.interactive && m.interactive.type === 'carousel'); ok(!!car, P.slice(-2)+' Hi shows photo cards ('+(car?car.interactive.action.cards.length:0)+')');
  const d = say(P, null, 'TR|consult'); const ids = []; d.forEach(m => { const i = m.interactive; if (i && i.action && i.action.sections) i.action.sections.forEach(s => s.rows.forEach(r => ids.push(r.id))); });
  let sid = ids.find(x => x.startsWith('S|')); if (!sid) { const t2 = say(P, null, ids.find(x => x.startsWith('D|'))); t2.forEach(m => { const i = m.interactive; if (i && i.action && i.action.sections) i.action.sections.forEach(s => s.rows.forEach(r => { if (!sid && r.id.startsWith('S|')) sid = r.id; })); }); }
  return say(P, null, sid); };
// 1: all in one message
let h = slot('919800000101'); ok(/one message/.test(txt(h[0])), 'held asks for name, age, gender in one message');
let r = say('919800000101', 'Sunita Devi, 45, Female'); ok(/booked/i.test(txt(r[0])) && r.some(m => m.type === 'document'), 'one message books + PDF receipt: ' + txt(r[0]).slice(0, 60));
const k = Object.keys(mem.bkr || {})[0]; ok(k && mem.bkr[k].age === 45 && mem.bkr[k].sex === 'Female' && mem.bkr[k].name === 'Sunita Devi', 'receipt data saved: ' + JSON.stringify(mem.bkr[k]).slice(0, 120));
// 2: Myself then age+sex
slot('919800000102'); r = say('919800000102', null, 'SELF'); ok(/age and gender/.test(txt(r[0])), 'Myself -> asks age and gender: ' + txt(r[0]).slice(0, 60));
r = say('919800000102', '28 male'); ok(/booked/i.test(txt(r[0])), 'then "28 male" books'); 
// 3: name + age only -> gender buttons
slot('919800000103'); r = say('919800000103', 'Aman Gupta 31'); ok(r[0].interactive && r[0].interactive.action.buttons && r[0].interactive.action.buttons[0].reply.id === 'SEX|Male', 'name+age -> gender buttons');
r = say('919800000103', null, 'SEX|Male'); ok(/booked/i.test(txt(r[0])) && r.some(m => m.type === 'document'), 'gender tap books + receipt');
// 4: hindi style
slot('919800000104'); r = say('919800000104', 'Pinky ladki 8 saal'); ok(/booked/i.test(txt(r[0])), 'Hinglish "Pinky ladki 8 saal" books');
ok(mem.bkd && Object.values(mem.bkd).some(b => b.name === 'Pinky' && b.age === 8 && b.sex === 'Female'), 'parsed Pinky, 8, Female');
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
