const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const lines = html.split('\n');
console.log('Checking inline onclick handlers:');
lines.forEach((l, i) => { if (l.includes('onclick=')) console.log(`[Line ${i+1}] ${l.trim()}`); });
