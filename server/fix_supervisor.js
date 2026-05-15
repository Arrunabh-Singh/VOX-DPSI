import bcrypt from 'bcryptjs';
const dbHash = '$2a$12$tboHXbLlZX1ac4qL2ATrAe2'; // truncated, need full hash
// Can't test with truncated hash

// Let me just update the password directly via Supabase
// We'll use the service role to update the password_hash

// First, generate a new hash
const newHash = await bcrypt.hash('demo123', 12);
console.log('New hash for demo123:', newHash);
