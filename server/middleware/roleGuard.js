/**
 * Middleware factory — allows only the listed roles.
 * Usage: router.get('/route', verifyToken, allowRoles('principal', 'coordinator'), handler)
 */
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden for your role' })
    }
    next()
  }
}
