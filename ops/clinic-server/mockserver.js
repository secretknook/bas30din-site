const http = require('http'); const fs = require('fs'); const { DateTime } = require('luxon');
const code = fs.readFileSync('decide_v2.js', 'utf8');
const fn = new Function('DateTime', '$', '$getWorkflowStaticData', 'return (()=>{' + code + '})()');
const S = { clinicName: 'Aarna Skin & Hair Clinic', doctorName: 'Dr. Neha Verma', address: 'Knowledge Park', clinicPhone: '+91 98765 43210', sheetTab: 'Appointments', slotMinutes: 15, patientsPerSlot: 1, daysAhead: 7, bookBeforeMinutes: 30, holdMinutes: 10, maxBookingsPerPhone: 3,
  hours: { mon: ['00:00-23:59'], tue: ['00:00-23:59'], wed: ['00:00-23:59'], thu: ['00:00-23:59'], fri: ['00:00-23:59'], sat: ['00:00-23:59'], sun: ['00:00-23:59'] },
  services: [], faq: [], adminNumbers: ['917903568856'], templates: {}, staff: [{ phone: '917903568856', name: 'Alok', role: 'owner' }, { phone: '918002187717', name: 'Priya', role: 'reception' }, { phone: '919999999999', name: 'Dr. Neha', role: 'doctor' }], fee: 500, upiId: 'nehaverma@okhdfc', hookKey: 'hk', tvKey: 'tv123', botNumber: '15551823589', appUrl: 'http://localhost:8099/webhook/desk' };
const mem = {};
const today = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd');
const sheet = [['Pooja Verma', '919000000011', '', today, '11:45', 'Confirmed', '', '', 'hl', 'Pigmentation & tan'], ['Mohd. Faizan', '919000000012', '', today, '12:00', 'Booked', '', '', 'hl', 'Skin consultation'], ['Rahul Yadav', '919000000013', '', today, '17:00', 'Confirmed', '', '', 'hl', 'HydraFacial / glow'], ['Pooja Verma', '919000000011', '', '2026-10-21', '11:00', 'Confirmed', '', '', 'hl', 'Pigmentation & tan']]
  .map((r, i) => ({ row_number: i + 2, Name: r[0], Phone: r[1], Email: r[2], Date: r[3], Time: r[4], Status: r[5], 'Booked at': r[6], Reminder: r[7], Lang: r[8], Service: r[9] }));
global.sent = [];
const run = (kind, x) => { const res = fn(DateTime, n => ({ first: () => {
  if (n === 'Clinic Settings') return { json: S };
  if (n === 'Desk API (POST)') { if (kind !== 'desk') throw 0; return { json: { body: x } }; }
  if (n === 'Parse message') { if (kind !== 'chat') throw 0; return { json: x }; }
  return { json: { values: [] } }; }, all: () => sheet.map(json => ({ json })) }), () => mem); const j = res[0] && res[0].json; applySheet(j); return j; };
const applySheet = j => { if (!j || !j.values || !j.range) return; const r = decodeURIComponent(j.range); const v = j.values[0]; const K = ['Name', 'Phone', 'Email', 'Date', 'Time', 'Status', 'Booked at', 'Reminder', 'Lang', 'Service'];
  const m = r.match(/!A(\d+):/); if (m) { const row = sheet.find(x => x.row_number === Number(m[1])); if (row) v.forEach((x, i) => { row[K[i]] = x; }); }
  else { const o = { row_number: sheet.length + 2 }; K.forEach((k, i) => { o[k] = v[i] == null ? '' : v[i]; }); sheet.push(o); } };
module.exports = { run, mem, S, sheet };
if (require.main === module) {
  // seed: patients take tokens, a live chat, a callback
  ['Riya Sharma', 'Aman Gupta', 'Sunita Devi', 'Kavya Nair', 'Arjun Mehta'].forEach((n, i) => run('chat', { from: '9190000002' + i, name: n, type: 'text', text: 'TOKEN', replyId: '' }));
  run('chat', { from: '918888888888', name: 'Bhaiya', type: 'interactive', text: '', replyId: 'LIVE' });
  run('chat', { from: '918888888888', name: 'Bhaiya', type: 'text', text: 'Laser ka price kya hai?', replyId: '' });
  run('chat', { from: '917777777777', name: 'Ritu', type: 'interactive', text: '', replyId: 'MC_CALL' });
  run('desk', { action: 'mc_log', key: 'hk', phone: '919811000412' }); run('desk', { action: 'mc_log', key: 'hk', phone: '919000000011' });
  http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/webhook/desk')) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(process.env.DESK || 'app/desk.html')); }
    if (req.method === 'GET' && req.url.startsWith('/sess')) { const u = new URL('http://x' + req.url); const ph = u.searchParams.get('p'); const st = (S.staff || []).find(x => x.phone === ph); mem.sess = mem.sess || {}; const id = 'T' + ph; mem.sess[id] = { phone: ph, role: st.role, name: st.name, exp: '2099-01-01T00:00:00.000Z' }; res.end(id); return; }
    if (req.method === 'GET' && req.url.startsWith('/mk')) { const ph = new URL('http://x' + req.url).searchParams.get('p'); const o = run('chat', { from: ph, name: 'Staff', type: 'text', text: 'LOGIN', replyId: '' }); res.end(o.payload.interactive.action.parameters.url); return; }
    if (req.method === 'GET' && req.url.startsWith('/last')) { const m = global.sent[global.sent.length - 1]; res.end(JSON.stringify(m)); return; }
    if (req.method === 'GET' && req.url.startsWith('/key')) { res.end(mem.q.list[3].key); return; }
    let b = ''; req.on('data', c => b += c); req.on('end', () => { const o = run('desk', JSON.parse(b || '{}')); if (o.payload) global.sent.push(o.payload); (o.more || []).forEach(m => global.sent.push(m)); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o.desk)); });
  }).listen(8099, () => console.log('up'));
}
