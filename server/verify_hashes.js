import bcrypt from 'bcryptjs';
const oldHash = '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe';
const newHash = '$2a$12$rTRADgFgkTSqklzUm9jdseUptItKn5e10OKqa5Mz98RbM..Tr8pdK';

console.log('Old hash matches demo123:', await bcrypt.compare('demo123', oldHash));
console.log('New hash matches demo123:', await bcrypt.compare('demo123', newHash));

// Also check the VP hash
const vpHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6';
console.log('VP hash matches demo123:', await bcrypt.compare('demo123', vpHash));
