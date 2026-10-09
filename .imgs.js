const fs = require('fs');
const s = fs.readFileSync('cm.html', 'utf8');
const m = [...s.matchAll(/<img[^>]+src="([^"]+)"/g)].map(x => x[1]);
console.log([...new Set(m)].slice(0, 40).join('\n'));
console.log('---links with cm/banner/hero---');
const l = [...s.matchAll(/(?:src|href)="([^"]*(?:banner|hero|slider|cm)[^"]*)"/gi)].map(x => x[1]);
console.log([...new Set(l)].slice(0, 30).join('\n'));
