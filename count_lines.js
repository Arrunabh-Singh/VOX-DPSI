const fs = require('fs');
const code = fs.readFileSync(process.argv[1], 'utf8');
const lines = code.split('\n');
console.log('Total lines:', lines.length);
console.log('File size:', code.length, 'chars');
// Show lines near where we expected error
for (let i = Math.max(1, lines.length - 20); i <= lines.length; i++) {
  console.log(`${i}: ${lines[i-1]}`);
}
