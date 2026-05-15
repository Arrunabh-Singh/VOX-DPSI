import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('demo123', 12);
console.log('HASH:', hash);
const verify = await bcrypt.compare('demo123', hash);
console.log('Verify:', verify);
