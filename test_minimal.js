// Minimal reproduction: define dummies and extract the arrow function
const router = { post: () => {} }
function verifyToken() {}
const supabase = {}
function notifyAssignment() {}
function formatComplaintNo() {}

// The actual handler from the chunk, but directly as function expression
const handler = async (req, res) => {
  try {
    const { role } = req.user
    if (!['coordinator', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }

    const { id } = req.params

    // simplified
    res.json({
      matched: true,
      message: 'Complaint assigned via skills-based routing',
      specialist_count: 5,
    })
  } catch (err) {
    console.error('Skills-assignment error:', err)
    res.status(500).json({ error: 'Skills-based assignment failed' })
  }
}

router.post('/test', verifyToken, handler)
