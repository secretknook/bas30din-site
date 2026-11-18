"""Build app/desk8.html: the current desk page (patient pages, invoice, tracker, TV stay as they are)
plus the new four-app staff desk. ?old=1 opens the old staff desk as a backup."""
import json
D = '/home/claude/clinic-server/app/'
A = '/home/claude/clinic-app/'
cur = open(D + 'desk.html').read()
old_router = "  else staff();\n})();"
assert old_router in cur, 'router not found'
cur = cur.replace(old_router, "  else if (qs.get('old')) staff();\n  else window.cd8Start();\n})();", 1)
css = open(A + 'app.css').read()
css += """
.demo.live{background:#FFFFFF;color:#4A5468;border-bottom:1px solid #E7E1D6}
.demo.live b{color:#16213A;font-family:'Newsreader',serif;font-size:17px;font-weight:600;margin-right:6px}
.demo.live .pill{border-color:#E1DACE;color:#4A5468;background:#FFF}
.demo.live .pill.on{background:#16213A;color:#FFF;border-color:#16213A}
.lv-dot{display:inline-flex;align-items:center;gap:6px;font-size:13px}
.lv-dot:before{content:'';width:8px;height:8px;border-radius:50%;background:#2E9E6A}
.lv-dot.busy:before{background:#E0A100}.lv-dot.off{color:#8E2A22}.lv-dot.off:before{background:#C2412D}
"""
files = ['data.js', 'core.js', 'reception.js', 'doctor.js', 'owner.js', 'patient.js', 'admin.js', 'docs.js', 'live.js']
js = '\n;\n'.join(open(A + f).read() for f in files)
boot = """<script>
window.cd8Start = function () {
  function go() {
    document.querySelectorAll('style').forEach(function (s) { s.remove(); });
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=IBM+Plex+Sans+Devanagari:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style'); st.textContent = document.getElementById('cd8-css').textContent; document.head.appendChild(st);
    document.title = 'Clinic Desk';
    var code = document.getElementById('cd8-js').textContent;
    document.body.innerHTML = '<div id="root"></div><div id="modal-root"></div>';
    var sc = document.createElement('script'); sc.textContent = code + '\\n;window.CD.liveBoot();'; document.body.appendChild(sc);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
};
</script>
"""
holder = '<script type="text/plain" id="cd8-css">' + css + '</script>\n' + \
         '<script type="text/plain" id="cd8-js">' + js.replace('</script', '<\\/script') + '</script>\n'
# the boot function must exist before the old page's script runs
i = cur.index('<script>/**')
cur = cur[:i] + boot + cur[i:]
cur = cur.replace('</body>', holder + '</body>', 1)
open(D + 'desk8.html', 'w').write(cur)
print('built desk8.html', len(cur) // 1024, 'KB')
