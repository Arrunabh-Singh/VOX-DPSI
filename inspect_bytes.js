const fs = require('fs');
const code = fs.readFileSync(process.argv[1], 'utf8');
const lines = code.split('\n');
for (let i = 2487; i <= 2493; i++) {
  const line = lines[i-1] || '';
  const bytes = Buffer.from(line, 'utf8');
  let hex = '';
  for (let j = 0; j < bytes.length; j++) {
    const b = bytes[j];
    if (b >= 32 && b <= 126) {
      hex += String.fromCharCode(b);
    } else {
      hex += `\\x${b.toString(16).padStart(2,'0')}`;
    }
  }
  console.log(`Line ${i}: ${hex}`);
}
