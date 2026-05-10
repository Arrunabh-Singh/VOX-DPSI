const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const lines = code.split('\n');

// Find any non-ASCII chars
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const cc = line.charCodeAt(j);
    if (cc > 127) {
      console.log(`Non-ASCII at line ${i+1} col ${j+1}: 0x${cc.toString(16)} ('${line[j]}')`);
    }
  }
}

// Also report unterminated strings/comment spans by scanning raw
// Check for *, / not forming proper comment close
console.log('\n--- Checking for suspicious patterns before line 2491 ---');
const pre = code.substring(0, code.split('\n').slice(0, 2491).join('\n').length);
// Count block comment open
let inBlock = false;
let lineNum = 1;
for (let i = 0; i < pre.length; i++) {
  if (pre[i] === '\n') lineNum++;
  if (!inBlock && pre[i] === '/' && pre[i+1] === '*') {
    inBlock = true;
  } else if (inBlock && pre[i] === '*' && pre[i+1] === '/') {
    inBlock = false;
  }
}
if (inBlock) {
  console.log('Unclosed block comment before line 2491!');
}

// Check unmatched quotes
const singleQuotes = (pre.match(/'/g) || []).length;
const doubleQuotes = (pre.match(/"/g) || []).length;
const backticks = (pre.match(/`/g) || []).length;
console.log(`Quote counts before line 2491 - single:${singleQuotes} double:${doubleQuotes} backtick:${backticks}`);
