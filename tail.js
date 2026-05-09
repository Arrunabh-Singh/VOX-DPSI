const fs = require('fs');
const filePath = process.argv[2];
const code = fs.readFileSync(filePath, 'utf8');
const lines = code.split('\n');
console.log('File:', filePath);
console.log('Total lines:', lines.length);
console.log('--- last 30 lines ---');
for (let i = Math.max(1, lines.length - 29); i <= lines.length; i++) {
  console.log(`${i.toString().padStart(5)}: ${lines[i-1]}`);
}
