const { readFileSync, writeFileSync } = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(readFileSync('site-data.js', 'utf8'), context);
const site = context.window.SITE;
const base = 'https://bas30din.com/';
const xml = value => String(value ?? '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const now = Date.now();
const items = [];
function add(id, title, description, date, link) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error(`Missing publication date: ${id}`);
  const timestamp = Date.parse(date + 'T00:00:00+05:30');
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid publication date: ${id}`);
  if (timestamp > now) return;
  items.push({id, title, description, timestamp, link});
}
for (const course of site.challenges) {
  if (course.status === 'soon') continue;
  for (const day of course.days || []) {
    if (day.published === false) continue;
    const link = base + '#d-' + course.id + '-' + day.day;
    add('lesson:' + course.id + ':' + day.day, 'Day ' + day.day + ': ' + day.title,
      course.title + '. Read the lesson, notes and available files.', day.date, link);
    for (const file of day.files || []) {
      if (file.published === false) continue;
      add('file:' + course.id + ':' + day.day + ':' + file.url, 'New file: ' + file.name,
        file.note || ('A new download for ' + course.title + ', Day ' + day.day + '.'), file.date || day.date, link);
    }
  }
}
items.sort((a,b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
const entries = items.slice(0,100).map(item => `<item><title>${xml(item.title)}</title><link>${xml(item.link)}</link><guid isPermaLink="false">${xml(item.id)}</guid><pubDate>${new Date(item.timestamp).toUTCString()}</pubDate><description>${xml(item.description)}</description></item>`).join('\n');
writeFileSync('rss.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Bas 30 Din: new lessons and files</title><link>${base}</link><description>New lessons, notes and downloads from Alok.</description><language>en</language><atom:link href="${base}rss.xml" rel="self" type="application/rss+xml"/>${entries}</channel></rss>\n`);
console.log(`Generated RSS feed with ${items.length} published updates.`);
