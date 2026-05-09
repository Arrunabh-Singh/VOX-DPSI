const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const lines = code.split('\n');
// isolate from line 2377 to 2492
const chunk = lines.slice(2376, 2492).join('\n');
console.log('=== CHUNK START ===');
console.log(chunk);
console.log('=== CHUNK END ===');
// Try to parse this chunk as a standalone script
try {
  new Function(chunk);
  console.log('Chunk parses OK as function body');
} catch (e) {
  console.error('Parse error in chunk:', e.message);
}
