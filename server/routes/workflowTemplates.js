import express from 'express'
import supabase from '../db/supabase.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const CAN_READ  = ['council_member','class_teacher','coordinator','principal','supervisor','vice_principal','director','board_member']
const CAN_WRITE = ['principal','supervisor','vice_principal']

// GET /api/workflow-templates — list all templates
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!CAN_READ.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised' })
    }
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .order('domain')
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workflow-templates/:domain — get template for a specific domain
router.get('/:domain', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('domain', req.params.domain)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Template not found' })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/workflow-templates/:domain — create or update a template
router.put('/:domain', verifyToken, async (req, res) => {
  try {
    if (!CAN_WRITE.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only coordinators and above can edit templates' })
    }

    const VALID_DOMAINS = ['academics','infrastructure','safety','personal','behaviour','other']
    const { domain } = req.params
    if (!VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({ error: 'Invalid domain' })
    }

    const {
      name,
      description,
      escalation_path,
      sla_override_hours,
      auto_urgent,
      skip_teacher,
      handler_guidance,
      is_active,
    } = req.body

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Template name must be at least 3 characters' })
    }
    if (escalation_path && !Array.isArray(escalation_path)) {
      return res.status(400).json({ error: 'escalation_path must be an array' })
    }
    if (sla_override_hours !== undefined && sla_override_hours !== null) {
      const sla = parseInt(sla_override_hours)
      if (isNaN(sla) || sla < 1 || sla > 720) {
        return res.status(400).json({ error: 'sla_override_hours must be between 1 and 720' })
      }
    }

    const payload = {
      domain,
      name:                name.trim(),
      description:         description?.trim() || null,
      escalation_path:     escalation_path || ['council_member','class_teacher','coordinator','principal'],
      sla_override_hours:  sla_override_hours ? parseInt(sla_override_hours) : null,
      auto_urgent:         !!auto_urgent,
      skip_teacher:        !!skip_teacher,
      handler_guidance:    handler_guidance?.trim() || null,
      is_active:           is_active !== false,
      updated_by:          req.user.id,
      updated_at:          new Date().toISOString(),
    }

    // Upsert on domain
    const { data, error } = await supabase
      .from('workflow_templates')
      .upsert({ ...payload, created_by: req.user.id }, { onConflict: 'domain' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    console.log(`[WorkflowTemplate] ${req.user.role} ${req.user.id} updated template for domain "${domain}"`)
    res.json(data)
  } catch (err) {
    console.error('[WorkflowTemplate] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
