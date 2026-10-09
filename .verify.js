const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const ids = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(m => m[1]);
for (const id of ids) console.log(html.includes(`id="${id}"`) ? 'ok ' + id : 'MISSING ' + id);
const imgs = [...html.matchAll(/src="(assets\/[^"]+)"/g)].map(m => m[1]);
for (const p of imgs) console.log(fs.existsSync(p) ? 'ok ' + p : 'MISSING FILE ' + p);
