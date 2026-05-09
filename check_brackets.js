const fs = require('fs');
const code = fs.readFileSync(process.argv[1], 'utf8');
let braces = 0, parens = 0, brackets = 0;
for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  if (ch === '{') braces++;
  if (ch === '}') braces--;
  if (ch === '(') parens++;
  if (ch === ')') parens--;
  if (ch === '[') brackets++;
  if (ch === ']') brackets--;
  if (braces < 0 || parens < 0 || brackets < 0) {
    const lineNum = code.substring(0, i).split('\n').length;
    console.log(`Unbalanced near line ${lineNum}, char ${i+1}: '${code.substring(Math.max(0,i-10), i+10)}'`);
    process.exit(1);
  }
}
console.log(`Braces: ${braces}, Parens: ${parens}, Brackets: ${brackets}`);
if (braces !== 0 || parens !== 0 || brackets !== 0) {
  console.log('UNBALANCED - SYNTAX ERROR LIKELY');
  process.exit(1);
}
