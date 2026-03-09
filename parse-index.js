const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');
console.log('Script tags:');
lines.forEach((l, i) => { if (l.includes('<script')) console.log(i+1, l); });
