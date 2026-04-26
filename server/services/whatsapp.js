/**
 * WhatsApp notification service via Twilio
 * All functions are fire-and-forget (no await needed at call site)
 * Falls back gracefully if env vars are not set
 */

let client = null

async function getTwilio() {
  if (client) return client
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null
  try {
    const twilio = await import('twilio')
    client = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return client
  } catch {
    return null
  }
}

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886' // Twilio sandbox default

async function sendWhatsApp(to, message) {
  if (!to) return
  const twilio = await getTwilio()
  if (!twilio) return // env not configured — silently skip

  const toNumber = `whatsapp:${to.startsWith('+') ? to : '+91' + to}`
  try {
    await twilio.messages.create({ from: FROM, to: toNumber, body: message })
  } catch (err) {
    console.warn('WhatsApp send failed:', err.message)
  }
}

/**
 * Notify student that their complaint was received
 */
export async function notifyComplaintRaised(phone, complaintNo, domain) {
  const msg = [
    `*Vox DPSI* 📢`,
    ``,
    `Your complaint has been received!`,
    `*Complaint No:* ${complaintNo}`,
    `*Domain:* ${domain}`,
    ``,
    `A council member will contact you within 48 hours.`,
    `Track status at: vox-dpsi.vercel.app`,
  ].join('\n')
  await sendWhatsApp(phone, msg)
}

/**
 * Notify student of a status update
 */
export async function notifyComplaintUpdate(phone, complaintNo, newStatus) {
  const statusLabels = {
    verified:                   'Verified ✅ — Your complaint was verified in person.',
    in_progress:                'In Progress 🔄 — Being actively worked on.',
    escalated_to_teacher:       'Escalated to Class Teacher ⬆️',
    escalated_to_coordinator:   'Escalated to Coordinator ⬆️',
    escalated_to_principal:     'Escalated to Principal ⬆️',
    resolved:                   'Resolved 🎉 — Please rate your experience.',
    closed:                     'Closed 🔒',
  }
  const msg = [
    `*Vox DPSI* 📢`,
    ``,
    `Update on *${complaintNo}*:`,
    statusLabels[newStatus] || newStatus,
    ``,
    `View details: vox-dpsi.vercel.app`,
  ].join('\n')
  await sendWhatsApp(phone, msg)
}

/**
 * Notify council member of a new assignment
 */
export async function notifyCouncilAssignment(phone, complaintNo, domain) {
  const msg = [
    `*Vox DPSI* 📌`,
    ``,
    `New complaint assigned to you:`,
    `*Complaint No:* ${complaintNo}`,
    `*Domain:* ${domain}`,
    ``,
    `Please contact the student within 48 hours.`,
    `Login: vox-dpsi.vercel.app`,
  ].join('\n')
  await sendWhatsApp(phone, msg)
}

/**
 * Auto-escalation alert to supervisor
 */
export async function notifyAutoEscalation(phone, complaintNo, hoursOld) {
  const msg = [
    `*Vox DPSI* ⚠️ Auto-Escalation`,
    ``,
    `Complaint *${complaintNo}* has had no action for ${hoursOld} hours and has been auto-escalated.`,
    ``,
    `Immediate attention required.`,
    `Login: vox-dpsi.vercel.app`,
  ].join('\n')
  await sendWhatsApp(phone, msg)
}

/**
 * Generic admin/supervisor alert — sent for every key system event.
 * Used when ADMIN_WHATSAPP_NUMBER is set in env.
 */
export async function notifyAdminAlert(phone, detail) {
  const msg = [
    `*Vox DPSI* 🏫 Admin Alert`,
    ``,
    detail,
    ``,
    `vox-dpsi.vercel.app`,
  ].join('\n')
  await sendWhatsApp(phone, msg)
}
