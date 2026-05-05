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
import { notifyAutoEscalationEvent, notifyStatusChange, notifySlaApproaching, notifyFollowupReminder } from '../services/notifications.js'

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
          // ── Idempotency guard: skip if already auto-escalated in the last 2 hours ──
          const { data: recentEntry } = await supabase
            .from('complaint_timeline')
            .select('id')
            .eq('complaint_id', complaint.id)
            .eq('performed_by_role', 'system')
            .gte('created_at', new Date(Date.now() - 2 * 3600 * 1000).toISOString())
            .limit(1)

          if (recentEntry && recentEntry.length > 0) {
            console.log(`[AutoEscalate] Skipping ${complaint.id} — already escalated in last 2h (duplicate guard)`)
            continue
          }

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

          // Notify student of auto-escalation (in-app + WhatsApp)
          notifyStatusChange(
            complaint.student_id,
            complaintNo,
            'in_progress',
            'escalated_to_coordinator',
            complaint.id
          )

          // Notify all supervisors (in-app + WhatsApp)
          const { data: supervisors } = await supabase
            .from('users')
            .select('id, phone')
            .eq('role', 'supervisor')

          if (supervisors) {
            for (const sup of supervisors) {
              notifyAutoEscalationEvent(sup.id, complaintNo, hoursOld, complaint.id)
              if (sup.phone) notifyAutoEscalation(sup.phone, complaintNo, hoursOld)
            }
          }

          // Notify all coordinators (in-app)
          const { data: coordinators } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'coordinator')

          if (coordinators) {
            for (const coord of coordinators) {
              notifyAutoEscalationEvent(coord.id, complaintNo, hoursOld, complaint.id)
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
  startSlaAlertCron()
  startFollowupReminderCron()
}

// ── Scheduled Follow-up Reminders (#5) ───────────────────────────────────────
// Runs every hour at :15. Finds open complaints at council_member level that
// have been inactive for 24h or 48h and sends a follow-up reminder to the
// assigned handler. Uses timeline deduplication so each threshold fires once.
// (72h triggers auto-escalation, handled by startAutoEscalateCron above)

const REMINDER_THRESHOLDS_HOURS = [24, 48]

function startFollowupReminderCron() {
  cron.schedule('15 * * * *', async () => {
    console.log('[FollowupReminder] Running follow-up reminder check...')
    try {
      for (const threshold of REMINDER_THRESHOLDS_HOURS) {
        const cutoffOld = new Date(Date.now() - threshold * 60 * 60 * 1000).toISOString()
        const cutoffNew = new Date(Date.now() - (threshold - 1) * 60 * 60 * 1000).toISOString()

        // Complaints that crossed this threshold in the last hour
        const { data: complaints, error } = await supabase
          .from('complaints')
          .select('id, complaint_no, assigned_council_member_id')
          .in('status', ['raised', 'verified', 'in_progress'])
          .eq('current_handler_role', 'council_member')
          .not('assigned_council_member_id', 'is', null)
          .lt('updated_at', cutoffOld)
          .gte('updated_at', cutoffNew) // only those that just crossed the window
          .limit(50)

        if (error) { console.error(`[FollowupReminder] Query error (${threshold}h):`, error.message); continue }
        if (!complaints || complaints.length === 0) continue

        console.log(`[FollowupReminder] ${complaints.length} complaint(s) at ${threshold}h threshold.`)

        for (const complaint of complaints) {
          try {
            // Dedupe: skip if already reminded at this threshold
            const { data: existing } = await supabase
              .from('complaint_timeline')
              .select('id')
              .eq('complaint_id', complaint.id)
              .like('action', `%${threshold}h reminder%`)
              .limit(1)

            if (existing && existing.length > 0) continue

            const complaintNo = formatComplaintNo(complaint.complaint_no)

            // Add transparent timeline entry
            await supabase.from('complaint_timeline').insert({
              complaint_id: complaint.id,
              action: `📌 Reminder sent — ${threshold}h reminder`,
              performed_by: null,
              performed_by_role: 'system',
              note: `Automated ${threshold}-hour inactivity reminder sent to assigned council member.`,
            })

            // Notify handler
            await notifyFollowupReminder(
              complaint.assigned_council_member_id,
              complaintNo,
              threshold,
              complaint.id
            )

            console.log(`[FollowupReminder] ${threshold}h reminder → ${complaintNo}`)
          } catch (innerErr) {
            console.error(`[FollowupReminder] Error for ${complaint.id}:`, innerErr.message)
          }
        }
      }
    } catch (err) {
      console.error('[FollowupReminder] Cron failed:', err.message)
    }
  })
  console.log('✅ Follow-up reminder cron started (runs every hour at :15)')
}

// ── SLA Approaching Alert (#2) ────────────────────────────────────────────────
// Runs every hour. Finds open complaints whose sla_deadline is within the next
// 6 hours and sends an in-app notification to the current handler.
// Uses a dedupe key in the timeline so each complaint is only alerted once per
// SLA window (not every hour for 6 consecutive hours).

const SLA_WARN_HOURS = 6 // send alert when this many hours remain

function startSlaAlertCron() {
  cron.schedule('30 * * * *', async () => { // runs at :30 of every hour
    console.log('[SlaAlert] Running SLA approaching check...')
    try {
      const now = new Date()
      const windowEnd = new Date(now.getTime() + SLA_WARN_HOURS * 60 * 60 * 1000)

      // Open complaints with an SLA deadline in the next 6 hours
      const { data: approaching, error } = await supabase
        .from('complaints')
        .select('id, complaint_no, sla_deadline, current_handler_role, assigned_council_member_id, student_id')
        .not('sla_deadline', 'is', null)
        .not('status', 'in', '("resolved","closed","withdrawn")')
        .lte('sla_deadline', windowEnd.toISOString())
        .gte('sla_deadline', now.toISOString()) // not already breached

      if (error) { console.error('[SlaAlert] Query error:', error.message); return }
      if (!approaching || approaching.length === 0) {
        console.log('[SlaAlert] No approaching SLAs.'); return
      }

      console.log(`[SlaAlert] ${approaching.length} complaint(s) approaching SLA.`)

      for (const complaint of approaching) {
        try {
          // Dedupe: skip if we already sent an SLA alert for this complaint in the last 5 hours
          const { data: recentAlert } = await supabase
            .from('complaint_timeline')
            .select('id')
            .eq('complaint_id', complaint.id)
            .like('action', '%SLA Alert%')
            .gte('created_at', new Date(now.getTime() - 5 * 3600 * 1000).toISOString())
            .limit(1)

          if (recentAlert && recentAlert.length > 0) {
            console.log(`[SlaAlert] Skipping ${complaint.complaint_no} — already alerted recently`)
            continue
          }

          const hoursLeft = Math.max(1, Math.round(
            (new Date(complaint.sla_deadline).getTime() - now.getTime()) / 3600000
          ))
          const complaintNo = formatComplaintNo(complaint.complaint_no)

          // Add a transparent timeline entry
          await supabase.from('complaint_timeline').insert({
            complaint_id: complaint.id,
            action: `⏰ SLA Alert — ${hoursLeft}h remaining`,
            performed_by: null,
            performed_by_role: 'system',
            note: `SLA deadline approaches. Handler must take action within ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} to avoid auto-escalation.`,
          })

          // Notify the council member (if assigned)
          if (complaint.assigned_council_member_id) {
            await notifySlaApproaching(
              complaint.assigned_council_member_id,
              complaintNo,
              hoursLeft,
              complaint.id
            )
          }

          // Notify all coordinators if handler is at coordinator level
          if (complaint.current_handler_role === 'coordinator') {
            const { data: coordinators } = await supabase
              .from('users').select('id').eq('role', 'coordinator')
            if (coordinators) {
              for (const c of coordinators) {
                await notifySlaApproaching(c.id, complaintNo, hoursLeft, complaint.id)
              }
            }
          }

          console.log(`[SlaAlert] Alerted handler for ${complaintNo} — ${hoursLeft}h remaining`)
        } catch (innerErr) {
          console.error(`[SlaAlert] Error for ${complaint.id}:`, innerErr.message)
        }
      }
    } catch (err) {
      console.error('[SlaAlert] Cron job failed:', err.message)
    }
  })
  console.log('✅ SLA alert cron job started (runs every hour at :30)')
}

// ── Data Retention Policy (#32) ───────────────────────────────────────────────
// DPDP Act 2023 / institutional policy: complaints must not be retained beyond
// 2 years after closure.  Runs daily at 02:30 IST (UTC+5:30 → 21:00 UTC prev day).
// "Archived" is a soft-delete: row remains for court-ordered access; PII can be
// erased separately via the erasure workflow (#60).

const RETENTION_YEARS = 2

export function startRetentionCron() {
  // "0 21 * * *" = 21:00 UTC daily = 02:30 IST
  cron.schedule('0 21 * * *', async () => {
    console.log('[Retention] Running data retention sweep...')
    try {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)

      // Find closed/resolved complaints past the retention window
      const { data: stale, error } = await supabase
        .from('complaints')
        .select('id, complaint_no, attachment_url')
        .in('status', ['resolved', 'closed'])
        .lt('updated_at', cutoff.toISOString())

      if (error) { console.error('[Retention] Query error:', error.message); return }
      if (!stale || stale.length === 0) { console.log('[Retention] Nothing to archive.'); return }

      console.log(`[Retention] Archiving ${stale.length} complaint(s)...`)

      for (const c of stale) {
        try {
          // ── Mark archived ──────────────────────────────────────────────────
          await supabase
            .from('complaints')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', c.id)

          await supabase.from('complaint_timeline').insert({
            complaint_id: c.id,
            action: '🗄️ Archived — data retention policy',
            performed_by: null,
            performed_by_role: 'system',
            note: `Complaint automatically archived after ${RETENTION_YEARS}-year retention window. Record preserved for legal/audit access. Personal data eligible for erasure on request (DPDP Act 2023).`,
          })

          // ── Remove storage attachment if present ──────────────────────────
          if (c.attachment_url) {
            // Resolve storage path from URL or path string
            let storagePath = c.attachment_url
            if (storagePath.startsWith('http')) {
              const m = storagePath.match(/\/object\/(?:public|sign)\/attachments\/(.+?)(?:\?|$)/)
              if (m) storagePath = m[1]
            }
            if (!storagePath.startsWith('http')) {
              const { error: rmErr } = await supabase.storage
                .from('attachments')
                .remove([storagePath])
              if (rmErr) console.warn(`[Retention] Storage removal failed for ${storagePath}:`, rmErr.message)
            }
          }

          console.log(`[Retention] Archived ${formatComplaintNo(c.complaint_no)}`)
        } catch (innerErr) {
          console.error(`[Retention] Error archiving ${c.id}:`, innerErr.message)
        }
      }

      console.log(`[Retention] Sweep complete. Archived ${stale.length} record(s).`)
    } catch (err) {
      console.error('[Retention] Cron job failed:', err.message)
    }
  })
  console.log('✅ Data retention cron started (daily at 02:30 IST)')
}

// ── Term-expiry alert cron (#24) ─────────────────────────────────────────────
// Runs daily at 08:00 IST (02:30 UTC). Notifies the principal (via in-app
// notification) when a council member's term ends within the next 30 days.
export async function checkTermExpiryAlerts() {
  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { data: expiring } = await supabase
    .from('users')
    .select('id, name, role, term_end, term_role, section, house')
    .in('role', ['council_member', 'supervisor'])
    .lte('term_end', in30)
    .gte('term_end', today)

  if (!expiring || expiring.length === 0) return

  // Notify all principals + vice principals
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .in('role', ['principal', 'vice_principal'])

  for (const admin of (admins || [])) {
    for (const member of expiring) {
      const daysLeft = Math.ceil((new Date(member.term_end) - new Date(today)) / 86400000)
      const label    = member.term_role || member.role.replace('_', ' ')
      await supabase.from('notifications').insert({
        user_id: admin.id,
        type:    'term_expiry_alert',
        title:   `⏳ Term expiring soon: ${member.name}`,
        message: `${member.name} (${label}${member.section ? ` · ${member.section}` : ''}) — term ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${member.term_end}). Plan rotation.`,
        link:    '/principal/team',
      }).catch(() => {})
    }
  }

  console.log(`[TermExpiry] Sent alerts for ${expiring.length} expiring council member(s).`)
}

export function startTermExpiryCron() {
  // "30 2 * * *" = 02:30 UTC = 08:00 IST
  cron.schedule('30 2 * * *', async () => {
    console.log('[TermExpiry] Checking for expiring council member terms...')
    try {
      await checkTermExpiryAlerts()
    } catch (err) {
      console.error('[TermExpiry] Cron job failed:', err.message)
    }
  })
  console.log('✅ Term-expiry cron started (daily at 08:00 IST)')
}
