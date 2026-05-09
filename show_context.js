const fs = require('fs');
const code = fs.readFileSync(process.argv[1], 'utf8');
const lines = code.split('\n');

// Write segment around error
const start = Math.max(0, 2491 - 50);
const end = Math.min(lines.length, 2491 + 10);
console.log('Lines', start+1, 'to', end, '(error at', 2491, '):');
console.log('='.repeat(60));
for (let i = start; i < end; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
