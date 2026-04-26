import supabase from '../db/supabase.js'
import {
  notifyComplaintRaised,
  notifyComplaintUpdate,
  notifyCouncilAssignment,
  notifyAutoEscalation,
  notifyAdminAlert,
} from './whatsapp.js'

// Admin/supervisor number that gets WhatsApp for EVERY key event
const ADMIN_WA = process.env.ADMIN_WHATSAPP_NUMBER || null

/**
 * Creates an in-app notification for a user.
 */
export async function createNotification(userId, title, body, type = 'status_update', complaintId = null) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      complaint_id: complaintId,
      is_read: false,
    })
    if (error) console.error('Notification insert error:', error.message)
  } catch (err) {
    console.error('createNotification exception:', err.message)
  }
}

/**
 * Helper — fetch a user's phone number from DB (may be null)
 */
async function getUserPhone(userId) {
  try {
    const { data } = await supabase.from('users').select('phone').eq('id', userId).single()
    return data?.phone || null
  } catch { return null }
}

/**
 * Notify a student that their complaint status changed.
 * Fires in-app + WhatsApp to student (if they have a phone) + admin.
 */
export async function notifyStatusChange(studentId, complaintNo, oldStatus, newStatus, complaintId) {
  const labels = {
    verified:                   'Verified ✅',
    in_progress:                'In Progress 🔄',
    escalated_to_teacher:       'Escalated to Teacher ⬆️',
    escalated_to_coordinator:   'Escalated to Coordinator ⬆️',
    escalated_to_principal:     'Escalated to Principal ⬆️',
    resolved:                   'Resolved 🎉',
    closed:                     'Closed 🔒',
    appealed:                   'Under Appeal 📋',
  }

  // In-app notification
  await createNotification(
    studentId,
    `${complaintNo} Status Update`,
    `Your complaint status changed to: ${labels[newStatus] || newStatus}`,
    'status_update',
    complaintId
  )

  // WhatsApp — student's own number
  const studentPhone = await getUserPhone(studentId)
  if (studentPhone) notifyComplaintUpdate(studentPhone, complaintNo, newStatus).catch(() => {})

  // WhatsApp — admin always gets notified
  if (ADMIN_WA) {
    notifyAdminAlert(ADMIN_WA, `📊 Status Change\n${complaintNo}: ${oldStatus} → ${newStatus}`).catch(() => {})
  }
}

/**
 * Notify a council member they've been assigned a complaint.
 */
export async function notifyAssignment(councilMemberId, complaintNo, domain, complaintId) {
  await createNotification(
    councilMemberId,
    `New Complaint Assigned — ${complaintNo}`,
    `A ${domain} complaint has been assigned to you for handling.`,
    'assignment',
    complaintId
  )

  // WhatsApp — council member's own number
  const phone = await getUserPhone(councilMemberId)
  if (phone) notifyCouncilAssignment(phone, complaintNo, domain).catch(() => {})

  // WhatsApp — admin
  if (ADMIN_WA) {
    notifyAdminAlert(ADMIN_WA, `📌 New Assignment\n${complaintNo} (${domain}) assigned to council`).catch(() => {})
  }
}

/**
 * Notify a handler (teacher/coordinator/principal) of an escalation.
 */
export async function notifyEscalation(handlerId, complaintNo, escalatedTo, complaintId) {
  const roleLabels = { class_teacher: 'Class Teacher', coordinator: 'Coordinator', principal: 'Principal' }
  await createNotification(
    handlerId,
    `Escalation: ${complaintNo}`,
    `A complaint has been escalated to ${roleLabels[escalatedTo] || escalatedTo} and requires your attention.`,
    'escalation',
    complaintId
  )

  // WhatsApp — handler's number
  const phone = await getUserPhone(handlerId)
  if (phone) notifyComplaintUpdate(phone, complaintNo, `escalated_to_${escalatedTo.replace('class_', '')}`).catch(() => {})

  // WhatsApp — admin always
  if (ADMIN_WA) {
    notifyAdminAlert(ADMIN_WA, `⬆️ Escalation\n${complaintNo} escalated to ${roleLabels[escalatedTo] || escalatedTo}`).catch(() => {})
  }
}

/**
 * Notify student their complaint was received (called right after raising).
 */
export async function notifyComplaintCreated(studentId, complaintNo, domain, complaintId) {
  await createNotification(
    studentId,
    `Complaint Received — ${complaintNo}`,
    `Your ${domain} complaint has been registered and assigned to a council member.`,
    'assignment',
    complaintId
  )

  // WhatsApp — student
  const phone = await getUserPhone(studentId)
  if (phone) notifyComplaintRaised(phone, complaintNo, domain).catch(() => {})

  // WhatsApp — admin
  if (ADMIN_WA) {
    notifyAdminAlert(ADMIN_WA, `🆕 New Complaint\n${complaintNo} (${domain}) raised`).catch(() => {})
  }
}

/**
 * Notify supervisor/admin of auto-escalation.
 */
export async function notifyAutoEscalationEvent(supervisorId, complaintNo, hoursOld, complaintId) {
  await createNotification(
    supervisorId,
    `Auto-Escalated: ${complaintNo}`,
    `Complaint ${complaintNo} had no action for ${hoursOld}h and was automatically escalated.`,
    'auto_escalation',
    complaintId
  )

  const phone = await getUserPhone(supervisorId)
  if (phone) notifyAutoEscalation(phone, complaintNo, hoursOld).catch(() => {})

  if (ADMIN_WA) {
    notifyAutoEscalation(ADMIN_WA, complaintNo, hoursOld).catch(() => {})
  }
}
