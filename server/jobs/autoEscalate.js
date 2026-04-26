/**
 * Auto-escalation cron job
 * Runs every hour, escalates complaints that have had no action in 72+ hours.
 *
 * Logic:
 *   - If a complaint is in status 'raised' or 'in_progress' at council_member level
 *     for more than 72 hours without update → escalate to coordinator
 *   - Mark is_auto_escalated = true
 *   - Add timeline entry
 *   - Send WhatsApp to supervisor if TWILIO env is configured
 */

import cron from 'node-cron'
import supabase from '../db/supabase.js'
import { formatComplaintNo } from '../utils/complaintNo.js'
import { notifyAutoEscalation } from '../services/whatsapp.js'

const AUTO_ESCALATE_AFTER_HOURS = 72

export function startAutoEscalateCron() {
  // Runs every hour on the hour
  cron.schedule('0 * * * *', async () => {
    console.log('[AutoEscalate] Running cron job...')
    try {
      const cutoff = new Date(Date.now() - AUTO_ESCALATE_AFTER_HOURS * 60 * 60 * 1000).toISOString()

      // Find stale complaints at council level
      const { data: staleComplaints, error } = await supabase
        .from('complaints')
        .select('*, student:student_id(phone)')
        .in('status', ['raised', 'verified', 'in_progress'])
        .eq('current_handler_role', 'council_member')
        .is('is_auto_escalated', false)
        .lt('updated_at', cutoff)

      if (error) {
        console.error('[AutoEscalate] Query error:', error.message)
        return
      }

      if (!staleComplaints || staleComplaints.length === 0) {
        console.log('[AutoEscalate] No stale complaints found.')
        return
      }

      console.log(`[AutoEscalate] Found ${staleComplaints.length} stale complaints.`)

      for (const complaint of staleComplaints) {
        try {
          // Escalate to coordinator
          const { data: updated, error: updateErr } = await supabase
            .from('complaints')
            .update({
              status: 'escalated_to_coordinator',
              current_handler_role: 'coordinator',
              is_auto_escalated: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', complaint.id)
            .select()
            .single()

          if (updateErr) {
            console.error(`[AutoEscalate] Failed to escalate ${complaint.id}:`, updateErr.message)
            continue
          }

          const hoursOld = Math.round((Date.now() - new Date(complaint.created_at).getTime()) / 3600000)
          const complaintNo = formatComplaintNo(complaint.complaint_no)

          // Add timeline entry
          await supabase.from('complaint_timeline').insert({
            complaint_id: complaint.id,
            action: `⚠️ Auto-escalated to Coordinator — no action for ${hoursOld} hours`,
            performed_by: null,
            performed_by_role: 'system',
            note: `Complaint automatically escalated after ${AUTO_ESCALATE_AFTER_HOURS}+ hours of inactivity at council level.`,
          })

          // Add escalation record
          await supabase.from('escalations').insert({
            complaint_id: complaint.id,
            escalated_by: null,
            escalated_to_role: 'coordinator',
            student_consent: false,
            reason: `Auto-escalated after ${hoursOld}h of inactivity`,
          })

          // WhatsApp notify supervisor (if env configured)
          const { data: supervisors } = await supabase
            .from('users')
            .select('phone')
            .eq('role', 'supervisor')
            .not('phone', 'is', null)

          if (supervisors) {
            for (const sup of supervisors) {
              notifyAutoEscalation(sup.phone, complaintNo, hoursOld)
            }
          }

          console.log(`[AutoEscalate] Escalated ${complaintNo}`)
        } catch (innerErr) {
          console.error(`[AutoEscalate] Error processing ${complaint.id}:`, innerErr.message)
        }
      }
    } catch (err) {
      console.error('[AutoEscalate] Cron job failed:', err.message)
    }
  })

  console.log('✅ Auto-escalation cron job started (runs every hour)')
}
