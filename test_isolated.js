// POST /api/complaints/:id/skills-assign — skills-based assignment by domain expertise (#37)
router.post('/:id/skills-assign', verifyToken, async (req, res) => {
  try {
    const { role } = req.user
    if (!['coordinator', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Not allowed' })
    }

    const { id } = req.params

    const { data: complaint, error: complaintErr } = await supabase
      .from('complaints')
      .select('id, complaint_no, domain')
      .eq('id', id)
      .single()
    if (complaintErr || !complaint) {
      return res.status(404).json({ error: 'Complaint not found' })
    }

    const { domain } = complaint
    if (!domain) {
      return res.status(400).json({ error: 'Complaint domain is required for skills-based assignment' })
    }

    const { data: members, error: membersErr } = await supabase
      .from('users')
      .select('id, name, domain_expertise')
      .eq('role', 'council_member')
      .order('created_at', { ascending: true })
    if (membersErr) throw membersErr
    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'No council members available for skills-based assignment' })
    }

    const specialists = members.filter(m =>
      Array.isArray(m.domain_expertise) && m.domain_expertise.includes(domain)
    )

    if (specialists.length === 0) {
      return res.json({
        matched: false,
        message: 'No specialist available — use round-robin or load-balance instead',
      })
    }

    const { data: openComplaints, error: openErr } = await supabase
      .from('complaints')
      .select('assigned_council_member_id, status')
      .in('status', ['raised', 'verified', 'in_progress'])
    if (openErr) throw openErr

    const openCountMap = {}
    for (const row of (openComplaints || [])) {
      const mid = row.assigned_council_member_id
      if (mid) {
        openCountMap[mid] = (openCountMap[mid] || 0) + 1
      }
    }

    let bestMember = specialists[0]
    let bestCount = openCountMap[bestMember.id] || 0
    for (let i = 1; i < specialists.length; i++) {
      const m = specialists[i]
      const cnt = openCountMap[m.id] || 0
      if (cnt < bestCount) {
        bestMember = m
        bestCount = cnt
      }
    }

    const now = new Date().toISOString()
    const { data: updated, error: updateErr } = await supabase
      .from('complaints')
      .update({
        assigned_council_member_id: bestMember.id,
        current_handler_role: 'council_member',
        updated_at: now,
      })
      .eq('id', id)
      .select('id, complaint_no, domain, assigned_council_member_id')
      .single()
    if (updateErr) throw updateErr

    await supabase.from('complaint_timeline').insert({
      complaint_id: id,
      action: `🎯 Skills-assigned to ${bestMember.name} (${domain} specialist)`,
      performed_by: req.user.id,
      performed_by_role: role,
      note: `${bestMember.name} had ${bestCount} open complaint(s) among ${specialists.length} specialist(s).`,
    })

    notifyAssignment(
      bestMember.id,
      formatComplaintNo(updated.complaint_no),
      updated.domain,
      id
    )

    res.json({
      matched: true,
      message: 'Complaint assigned via skills-based routing',
      complaint_id: id,
      complaint_no_display: formatComplaintNo(updated.complaint_no),
      assigned_member: {
        id: bestMember.id,
        name: bestMember.name,
        domain_expertise: bestMember.domain_expertise,
        open_count_before_assignment: bestCount,
      },
      specialist_count: specialists.length,
    })
  } catch (err) {
    console.error('Skills-assignment error:', err)
    res.status(500).json({ error: 'Skills-based assignment failed' })
  })
