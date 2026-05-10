const fs = require('fs');
const code = fs.readFileSync(process.argv[1], 'utf8');
const lines = code.split('\n');
for (let i = 2485; i <= 2495; i++) {
  const line = lines[i-1] || '';
  const bytes = Buffer.from(line, 'utf8');
  const hexDump = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join(' ');
  console.log(`Line ${i} (len ${bytes.length}): ${hexDump}`);
  console.log(`  repr: ${JSON.stringify(line)}`);
}
