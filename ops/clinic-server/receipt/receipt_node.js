// "Make booking receipt" — builds a one-page PDF from the booking saved by the bot. Read-only: saves nothing.
const mem = $getWorkflowStaticData('global');
const q = ($('Receipt (GET)').first().json.query) || {};
const r = (mem.bkr || {})[String(q.b || '')];
const A = s => String(s == null ? '' : s).replace(/₹/g, 'Rs. ').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const W = 420, H = 595; const ops = [];
const rect = (x, y, w, h, c) => ops.push(`${c} rg ${x} ${y} ${w} ${h} re f`);
const line = (x1, y1, x2, c) => ops.push(`${c} RG 0.6 w ${x1} ${y1} m ${x2} ${y1} l S`);
const txt = (x, y, s, size, bold, c) => ops.push(`BT ${c || '0.12 0.13 0.16'} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${A(s)}) Tj ET`);
const width = (s, size) => String(s).length * size * 0.5;
if (!r) { txt(40, 520, 'This receipt link is not valid any more.', 13, true); txt(40, 500, 'Please message the clinic on WhatsApp.', 11, false, '0.4 0.42 0.46'); }
else {
  rect(0, H - 118, W, 118, '0.055 0.486 0.525');
  txt(32, H - 48, r.clinic, 18, true, '1 1 1');
  txt(32, H - 70, 'Appointment confirmation', 11, false, '0.85 0.95 0.95');
  txt(32, H - 98, 'Booking ID  ' + r.id, 12, true, '1 1 1');
  const tick = 'CONFIRMED', tw = tick.length * 9 * 0.68; rect(W - 32 - tw - 18, H - 106, tw + 18, 20, '1 1 1'); txt(W - 32 - tw - 9, H - 100, tick, 9, true, '0.055 0.486 0.525');
  let y = H - 160;
  const row = (k, v) => { if (!v) return; txt(32, y, k, 9, false, '0.45 0.47 0.52'); txt(150, y, v, 11, true); y -= 10; line(32, y, W - 32, '0.9 0.91 0.93'); y -= 18; };
  row('Patient', r.name);
  row('Age / Gender', [r.age ? r.age + ' years' : '', r.sex].filter(Boolean).join(', '));
  row('Mobile', r.phone ? '+' + r.phone.slice(0, 2) + ' ' + r.phone.slice(2, 7) + ' ' + r.phone.slice(7) : '');
  row('Area', r.area);
  row('Visit for', r.svc);
  row('Date & time', r.when);
  row('Doctor', r.doctor);
  row('Fee', r.fee ? 'Rs. ' + Number(r.fee).toLocaleString('en-IN') + ', paid at the clinic' : '');
  y -= 6; rect(32, y - 52, W - 64, 62, '0.95 0.97 0.97');
  txt(44, y - 10, 'Before you come', 10, true, '0.055 0.486 0.525');
  txt(44, y - 26, 'Please arrive 10 minutes early and show this receipt at the reception.', 9, false, '0.3 0.32 0.36');
  txt(44, y - 40, 'Bring old prescriptions and reports, if any.', 9, false, '0.3 0.32 0.36');
  line(32, 92, W - 32, '0.9 0.91 0.93');
  txt(32, 74, r.clinic, 10, true); txt(32, 60, r.address, 9, false, '0.45 0.47 0.52'); txt(32, 46, r.cphone ? 'Phone: ' + r.cphone : '', 9, false, '0.45 0.47 0.52');
  const made = new Date(r.made); txt(32, 26, 'Booked on WhatsApp, ' + made.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }), 8, false, '0.6 0.62 0.66');
}
const stream = ops.join('\n');
const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
let pdf = '%PDF-1.4\n'; const off = [];
objs.forEach((o, i) => { off.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
const xref = pdf.length;
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
return [{ json: { pdf, name: r ? 'Booking ' + r.id + '.pdf' : 'receipt.pdf' } }];
