/**
 * Email service — nodemailer with SMTP (#59)
 * Required env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM  (default: noreply@dpsi.edu.in)
 *   CLIENT_URL  (for building consent links)
 *
 * In development (SMTP_HOST not set) we log email content to console
 * so the flow can be tested without a real SMTP server.
 */

import nodemailer from 'nodemailer'

const FROM_ADDR = process.env.EMAIL_FROM || '"Vox DPSI" <noreply@dpsi.edu.in>'

function makeTransport() {
  if (!process.env.SMTP_HOST) {
    // Dev fallback — ethereal-style null transport (logs to console)
    return nodemailer.createTransport({
      jsonTransport: true, // writes to info.message JSON — we log it
    })
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const transporter = makeTransport()

/**
 * Send the Verifiable Parental Consent email to a parent/guardian.
 * @param {string} parentEmail
 * @param {string} studentName
 * @param {string} token  — signed UUID stored in users.vpc_token
 */
export async function sendVpcConsentEmail(parentEmail, studentName, token) {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const grantUrl   = `${baseUrl}/vpc/verify?token=${token}&action=grant`
  const declineUrl = `${baseUrl}/vpc/verify?token=${token}&action=decline`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f5f7fa;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <!-- Header -->
  <div style="background:#003366;padding:24px 32px;text-align:center">
    <p style="color:#FFD700;font-size:22px;font-weight:900;margin:0;letter-spacing:1px">VOX DPSI</p>
    <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">Student Grievance Management System</p>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:2px 0 0">Delhi Public School Indore</p>
  </div>

  <!-- Body -->
  <div style="padding:32px">
    <p style="color:#1A1A1A;font-size:15px;font-weight:700;margin:0 0 8px">Parental Consent Required</p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 16px">
      Your child <strong>${studentName}</strong> has registered on <strong>Vox DPSI</strong>, the official confidential
      grievance portal of Delhi Public School Indore.
    </p>
    <p style="color:#4B5563;font-size:14px;line-height:1.6;margin:0 0 16px">
      Under the <strong>Digital Personal Data Protection Act 2023 (Section 9)</strong>, we are required to obtain
      verifiable consent from a parent or guardian before a student under 18 can use the platform.
    </p>

    <!-- What VoxDPSI does -->
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:0 0 20px">
      <p style="color:#166534;font-weight:700;font-size:13px;margin:0 0 8px">What is Vox DPSI?</p>
      <ul style="color:#15803D;font-size:13px;line-height:1.7;margin:0;padding-left:20px">
        <li>A safe, confidential space for students to raise concerns with the Student Council.</li>
        <li>Complaints are handled by trained council members, class teachers, or coordinators.</li>
        <li>Student identity is protected — no other student can see who raised a complaint.</li>
        <li>POSH/POCSO complaints are mandatorily routed to the school's Internal Committee.</li>
      </ul>
    </div>

    <p style="color:#4B5563;font-size:14px;margin:0 0 20px">
      Please choose one of the options below. This link is valid for <strong>72 hours</strong>.
    </p>

    <div style="text-align:center;margin:24px 0">
      <a href="${grantUrl}" style="display:inline-block;background:#16A34A;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;margin:0 8px 8px 0">
        ✅ I Give Consent
      </a>
      <a href="${declineUrl}" style="display:inline-block;background:#fff;color:#DC2626;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;border:2px solid #DC2626;margin:0 0 8px">
        ✕ I Decline
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:16px 0 0;line-height:1.5">
      If you didn't expect this email or have questions, contact the school at<br>
      <a href="mailto:principal@dpsi.edu.in" style="color:#003366">principal@dpsi.edu.in</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F5F7FA;padding:16px 32px;text-align:center;border-top:1px solid #E5E7EB">
    <p style="color:#9CA3AF;font-size:11px;margin:0">
      Delhi Public School Indore · Vox DPSI Grievance Portal<br>
      This email was sent because ${studentName} registered on Vox DPSI.
    </p>
  </div>
</div>
</body>
</html>`

  const info = await transporter.sendMail({
    from:    FROM_ADDR,
    to:      parentEmail,
    subject: `[Vox DPSI] Parental Consent Required — ${studentName}`,
    html,
    text: `Parental consent is required for ${studentName} to use Vox DPSI.\n\nGrant consent: ${grantUrl}\nDecline: ${declineUrl}\n\nThis link expires in 72 hours.`,
  })

  // In dev (jsonTransport) log the email to console for testing
  if (process.env.NODE_ENV !== 'production' && info.message) {
    const parsed = JSON.parse(info.message)
    console.log('[Email:VPC] Would send to:', parentEmail)
    console.log('[Email:VPC] Grant URL:', grantUrl)
    console.log('[Email:VPC] Decline URL:', declineUrl)
    console.log('[Email:VPC] Subject:', parsed.subject)
  }

  return { grantUrl, declineUrl }
}

// ── Status Change Email (#25) ─────────────────────────────────────────────────
// Sent to the student when their complaint status changes to a key milestone.

const STATUS_LABELS = {
  verified:                 { label: 'Verified ✅',                  color: '#2563EB' },
  in_progress:              { label: 'In Progress 🔄',               color: '#4F46E5' },
  escalated_to_teacher:     { label: 'Escalated to Teacher ⬆️',       color: '#D97706' },
  escalated_to_coordinator: { label: 'Escalated to Coordinator ⬆️',   color: '#B45309' },
  escalated_to_principal:   { label: 'Escalated to Principal ⬆️',     color: '#DC2626' },
  resolved:                 { label: 'Resolved 🎉',                  color: '#16A34A' },
  closed:                   { label: 'Closed 🔒',                    color: '#6B7280' },
}

/**
 * Send a status-change notification email to a student.
 * @param {string} studentEmail
 * @param {string} studentName
 * @param {string} complaintNo  — formatted VOX-XXX
 * @param {string} newStatus
 * @param {string|null} note    — optional resolution note
 */
export async function sendStatusChangeEmail(studentEmail, studentName, complaintNo, newStatus, note = null) {
  const meta = STATUS_LABELS[newStatus]
  if (!meta) return // don't send email for non-key statuses

  const { label, color } = meta
  const clientBase = process.env.CLIENT_URL || 'http://localhost:5173'

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f5f7fa;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  <div style="background:#003366;padding:24px 32px;text-align:center">
    <p style="color:#FFD700;font-size:22px;font-weight:900;margin:0;letter-spacing:1px">VOX DPSI</p>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0">Delhi Public School Indore</p>
  </div>
  <div style="padding:32px">
    <p style="color:#1A1A1A;font-size:15px;font-weight:700;margin:0 0 6px">Your complaint has been updated</p>
    <p style="color:#6B7280;font-size:13px;margin:0 0 20px">Hi ${studentName},</p>

    <div style="background:${color}11;border:1px solid ${color}44;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
      <p style="font-size:18px;font-weight:900;color:${color};margin:0 0 6px">${label}</p>
      <p style="font-family:monospace;font-weight:700;color:#003366;font-size:15px;margin:0">${complaintNo}</p>
    </div>

    ${note ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px;margin-bottom:20px">
      <p style="color:#374151;font-size:13px;margin:0;line-height:1.6"><strong>Note:</strong> ${note}</p>
    </div>` : ''}

    <div style="text-align:center;margin-top:24px">
      <a href="${clientBase}/complaints/${complaintNo}" style="display:inline-block;background:#003366;color:#FFD700;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">
        View My Complaint →
      </a>
    </div>

    <p style="color:#9CA3AF;font-size:11px;text-align:center;margin:20px 0 0;line-height:1.5">
      If you did not raise this complaint, contact the school at
      <a href="mailto:principal@dpsi.edu.in" style="color:#003366">principal@dpsi.edu.in</a>
    </p>
  </div>
  <div style="background:#F5F7FA;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
    <p style="color:#9CA3AF;font-size:11px;margin:0">Delhi Public School Indore · Vox DPSI Grievance Portal</p>
  </div>
</div>
</body>
</html>`

  const info = await transporter.sendMail({
    from: FROM_ADDR,
    to: studentEmail,
    subject: `[Vox DPSI] ${complaintNo} — ${label}`,
    html,
    text: `Hi ${studentName},\n\nYour complaint ${complaintNo} has been updated: ${label}\n${note ? '\nNote: ' + note + '\n' : ''}\nView it at: ${clientBase}\n`,
  })

  if (process.env.NODE_ENV !== 'production' && info.message) {
    const parsed = JSON.parse(info.message)
    console.log(`[Email:Status] Would send to: ${studentEmail}`)
    console.log(`[Email:Status] Subject: ${parsed.subject}`)
  }
}

// ── Daily Digest Email (#28) ──────────────────────────────────────────────────
// Sent to each handler at 07:30 IST every morning with their pending complaints.

const DOMAIN_EMOJI = {
  academics:      '📚',
  infrastructure: '🏗️',
  safety:         '🛡️',
  personal:       '👤',
  behaviour:      '⚠️',
  posh_pocso:     '🔴',
  other:          '📋',
}

const STATUS_SHORT = {
  raised:                   'Raised',
  verified:                 'Verified',
  in_progress:              'In Progress',
  escalated_to_teacher:     '↑ Teacher',
  escalated_to_coordinator: '↑ Coordinator',
  escalated_to_principal:   '↑ Principal',
  reopened:                 'Reopened',
}

/**
 * Send a morning digest email to one handler.
 * @param {string} toEmail
 * @param {string} toName
 * @param {string} role
 * @param {Array}  complaints  — array of complaint rows (with complaint_no_display, domain, status, updated_at, sla_deadline)
 */
export async function sendDailyDigestEmail(toEmail, toName, role, complaints) {
  if (!complaints.length) return

  const clientBase  = process.env.CLIENT_URL || 'http://localhost:5173'
  const dateStr     = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const now         = Date.now()

  // Separate SLA-breached and approaching
  const breached    = complaints.filter(c => c.sla_deadline && new Date(c.sla_deadline) < new Date())
  const approaching = complaints.filter(c => c.sla_deadline && new Date(c.sla_deadline) >= new Date() && new Date(c.sla_deadline) - now < 6 * 3600000)
  const normal      = complaints.filter(c => !breached.includes(c) && !approaching.includes(c))

  const roleLabel = {
    council_member: 'Council Member',
    class_teacher:  'Class Teacher',
    coordinator:    'Coordinator',
    principal:      'Principal',
    vice_principal: 'Vice Principal',
    supervisor:     'Supervisor',
  }[role] || role

  // Build complaint rows HTML
  const rowHtml = (list, borderColor) => list.map(c => {
    const domainEmoji = DOMAIN_EMOJI[c.domain] || '📋'
    const statusLabel = STATUS_SHORT[c.status] || c.status
    const hoursOld    = Math.round((now - new Date(c.updated_at)) / 3600000)
    const slaText     = c.sla_deadline
      ? (new Date(c.sla_deadline) < new Date()
          ? `<span style="color:#DC2626;font-weight:700">SLA BREACHED</span>`
          : `SLA: ${new Date(c.sla_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
      : ''
    return `
      <tr>
        <td style="padding:10px 12px;border-left:3px solid ${borderColor};font-family:monospace;font-weight:700;color:#1B4D2B;font-size:13px">${c.complaint_no_display || ('VOX-' + String(c.complaint_no).padStart(4, '0'))}</td>
        <td style="padding:10px 8px;font-size:13px;color:#374151">${domainEmoji} ${c.domain}</td>
        <td style="padding:10px 8px;font-size:12px;color:#6B7280">${statusLabel}</td>
        <td style="padding:10px 8px;font-size:12px;color:#6B7280">${hoursOld}h ago</td>
        <td style="padding:10px 8px;font-size:12px">${slaText}</td>
      </tr>`
  }).join('')

  const tableSection = (title, list, borderColor, bgColor) => list.length === 0 ? '' : `
    <p style="font-size:13px;font-weight:700;color:#374151;margin:20px 0 6px">${title} (${list.length})</p>
    <table style="width:100%;border-collapse:collapse;background:${bgColor};border-radius:8px;overflow:hidden;font-size:13px">
      <thead>
        <tr style="background:rgba(0,0,0,0.04)">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6B7280;font-weight:600">NO.</th>
          <th style="padding:8px 8px;text-align:left;font-size:11px;color:#6B7280;font-weight:600">DOMAIN</th>
          <th style="padding:8px 8px;text-align:left;font-size:11px;color:#6B7280;font-weight:600">STATUS</th>
          <th style="padding:8px 8px;text-align:left;font-size:11px;color:#6B7280;font-weight:600">LAST UPDATE</th>
          <th style="padding:8px 8px;text-align:left;font-size:11px;color:#6B7280;font-weight:600">SLA</th>
        </tr>
      </thead>
      <tbody>${rowHtml(list, borderColor)}</tbody>
    </table>`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f5f7fa;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:#1B4D2B;padding:24px 32px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <p style="color:#C9920A;font-size:20px;font-weight:900;margin:0;letter-spacing:1px">VOX DPSI</p>
        <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:3px 0 0">Delhi Public School Indore</p>
      </div>
      <div style="text-align:right">
        <p style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;margin:0">Morning Digest</p>
        <p style="color:rgba(255,255,255,0.55);font-size:11px;margin:2px 0 0">${dateStr}</p>
      </div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px">
    <p style="color:#1A1A1A;font-size:15px;font-weight:700;margin:0 0 4px">Good morning, ${toName} 👋</p>
    <p style="color:#6B7280;font-size:13px;margin:0 0 20px">
      Here's your daily summary as <strong>${roleLabel}</strong>. You have <strong>${complaints.length} open complaint${complaints.length !== 1 ? 's' : ''}</strong> awaiting attention.
    </p>

    <!-- Summary pills -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px">
      <div style="background:#FEE2E2;border-radius:8px;padding:10px 16px;text-align:center;min-width:80px">
        <p style="font-size:22px;font-weight:900;color:#DC2626;margin:0">${breached.length}</p>
        <p style="font-size:11px;color:#DC2626;font-weight:600;margin:2px 0 0">SLA Breached</p>
      </div>
      <div style="background:#FEF3C7;border-radius:8px;padding:10px 16px;text-align:center;min-width:80px">
        <p style="font-size:22px;font-weight:900;color:#D97706;margin:0">${approaching.length}</p>
        <p style="font-size:11px;color:#D97706;font-weight:600;margin:2px 0 0">Due Soon</p>
      </div>
      <div style="background:#F0FDF4;border-radius:8px;padding:10px 16px;text-align:center;min-width:80px">
        <p style="font-size:22px;font-weight:900;color:#16A34A;margin:0">${normal.length}</p>
        <p style="font-size:11px;color:#16A34A;font-weight:600;margin:2px 0 0">On Track</p>
      </div>
    </div>

    ${tableSection('🔴 SLA Breached — Action Required', breached, '#DC2626', '#FFF5F5')}
    ${tableSection('🟡 SLA Approaching (within 6h)', approaching, '#D97706', '#FFFBEB')}
    ${tableSection('🟢 Active Complaints', normal, '#16A34A', '#F0FDF4')}

    <!-- CTA -->
    <div style="text-align:center;margin:28px 0 0">
      <a href="${clientBase}" style="display:inline-block;background:#1B4D2B;color:#C9920A;font-weight:700;font-size:14px;padding:13px 32px;border-radius:8px;text-decoration:none">
        Open Vox DPSI Dashboard →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#F5F7FA;padding:14px 32px;text-align:center;border-top:1px solid #E5E7EB">
    <p style="color:#9CA3AF;font-size:11px;margin:0">
      Delhi Public School Indore · Vox DPSI · You receive this because you are an active handler.<br>
      This digest is sent every morning at 07:30 IST.
    </p>
  </div>
</div>
</body>
</html>`

  const info = await transporter.sendMail({
    from:    FROM_ADDR,
    to:      toEmail,
    subject: `[Vox DPSI] Morning Digest — ${complaints.length} open complaint${complaints.length !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    html,
    text: `Good morning ${toName},\n\nYour Vox DPSI morning digest (${dateStr}):\n\nSLA Breached: ${breached.length}\nDue Soon: ${approaching.length}\nOn Track: ${normal.length}\nTotal Open: ${complaints.length}\n\nOpen your dashboard: ${clientBase}\n`,
  })

  if (process.env.NODE_ENV !== 'production' && info.message) {
    console.log(`[Email:Digest] Would send to: ${toEmail} — ${complaints.length} complaints`)
  }
}
