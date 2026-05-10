const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const lines = code.split('\n');

// Insert line number comments to pinpoint exact location
const debugCode = lines.map((line, i) => `/*L${i+1}*/${line}`).join('\n');
const debugPath = process.argv[2] + '.debug.js';
fs.writeFileSync(debugPath, debugCode);
console.log('Debug file written to:', debugPath);

// Try to parse it
try {
  new (require('vm').Script)(debugCode, { filename: debugPath });
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax error:', e.message);
  console.error('Line:', e.lineNumber, 'Column:', e.columnNumber);
}
