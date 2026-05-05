/**
 * Formats a serial integer into VOX-XXXX display format
 * e.g. 1 → "VOX-0001", 42 → "VOX-0042"
 */
export function formatComplaintNo(serial) {
  return `VOX-${String(serial).padStart(4, '0')}`
}
