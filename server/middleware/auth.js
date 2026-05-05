import jwt from 'jsonwebtoken'

// #51 — Read token from HttpOnly cookie first, Bearer header as fallback
// (fallback supports Railway health checks and any legacy clients during transition)
export function verifyToken(req, res, next) {
  let token = req.cookies?.vox_token

  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
