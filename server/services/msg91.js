/**
 * MSG91 Service — SMS OTP + WhatsApp notifications (#27, #46)
 *
 * Required env vars:
 *   MSG91_AUTH_KEY          — from MSG91 dashboard → Settings → Authkey
 *   MSG91_OTP_TEMPLATE_ID   — from MSG91 dashboard → SMS → OTP Templates
 *   MSG91_SENDER_ID         — registered sender ID (default: VOXDPS)
 *   MSG91_WA_TEMPLATE_ID    — WhatsApp complaint_status_update template ID (once approved)
 *
 * Phone numbers are stored as 10-digit strings; we prefix 91 for MSG91.
 */

import https from 'https'

const AUTH_KEY       = process.env.MSG91_AUTH_KEY
const SENDER_ID      = process.env.MSG91_SENDER_ID || 'VOXDPS'
const OTP_TMPL       = process.env.MSG91_OTP_TEMPLATE_ID
const WA_TMPL        = process.env.MSG91_WA_TEMPLATE_ID

// ── Helpers ──────────────────────────────────────────────────────────────────

function msg91Request(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request({
      method:   'POST',
      hostname: 'control.msg91.com',
      path,
      headers: {
        'Content-Type':   'application/json',
        'authkey':        AUTH_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`MSG91 non-JSON response: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function mobile(phone10) { return `91${phone10}` }

// ── SMS OTP ───────────────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to an Indian mobile number via MSG91.
 * MSG91 generates the OTP internally when template_id is set.
 * Returns the OTP (MSG91 doesn't give it back; we generate it ourselves and
 * pass it in the request — easier to verify server-side).
 */
export async function sendSmsOtp(phone10digit) {
  if (!AUTH_KEY) {
    console.warn('[MSG91] AUTH_KEY not set — SMS OTP not sent')
    return { sent: false, reason: 'not_configured' }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  try {
    const payload = {
      flow_id:    OTP_TMPL,                 // OTP flow/template in MSG91
      sender:     SENDER_ID,
      mobiles:    mobile(phone10digit),
      OTP:        otp,                       // MSG91 replaces ##OTP## in template
    }

    const result = await msg91Request('/api/v5/flow/', payload)
    console.log(`[MSG91] SMS OTP sent to 91${phone10digit}:`, result)

    if (result.type === 'success') {
      return { sent: true, otp }
    } else {
      throw new Error(result.message || 'MSG91 returned failure')
    }
  } catch (err) {
    console.error('[MSG91] sendSmsOtp error:', err.message)
    throw err
  }
}

/**
 * Verify a 6-digit OTP for a phone number using MSG91.
 * Returns true on success, throws on failure.
 */
export async function verifySmsOtp(phone10digit, otp) {
  if (!AUTH_KEY) throw new Error('MSG91_AUTH_KEY not configured')

  const result = await msg91Request(
    `/api/v5/otp/verify?mobile=${mobile(phone10digit)}&otp=${otp}&authkey=${AUTH_KEY}`,
    {}
  )

  if (result.type === 'success') return true
  throw new Error(result.message || 'OTP verification failed')
}

/**
 * Resend OTP (retry — MSG91 throttles, so we just send a new one).
 */
export async function resendSmsOtp(phone10digit) {
  return sendSmsOtp(phone10digit)
}

// ── WhatsApp Business API ─────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message to a verified phone number.
 * Template variables for complaint_status_update:
 *   1 = complaint_no (e.g. VOX-042)
 *   2 = new_status   (e.g. "Escalated to Coordinator")
 *   3 = handler_name (e.g. "Mr. Kapil")
 *
 * NOTE: WhatsApp messages are only sent when:
 *   - MSG91_WA_TEMPLATE_ID is set (template approved)
 *   - recipient has whatsapp_opt_in = true and phone_verified = true
 */
export async function sendWhatsAppStatusUpdate(phone10digit, complaintNo, newStatus, handlerName) {
  if (!AUTH_KEY || !WA_TMPL) {
    console.log(`[WhatsApp-SKIP] Not configured — would send to 91${phone10digit}: ${complaintNo} → ${newStatus}`)
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const payload = {
      integrated_number: process.env.MSG91_WA_NUMBER || '',  // approved WhatsApp business number
      content_type: 'template',
      payload: {
        to:              mobile(phone10digit),
        type:            'template',
        template: {
          name:          WA_TMPL,
          language:      { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: complaintNo },
                { type: 'text', text: newStatus },
                { type: 'text', text: handlerName || 'the assigned handler' },
              ],
            },
          ],
        },
      },
    }

    const result = await msg91Request('/api/v5/whatsapp/whatsapp-outbound-message/bulk/', payload)
    console.log(`[WhatsApp] Status sent to 91${phone10digit}:`, result)
    return { sent: true, result }
  } catch (err) {
    console.error('[MSG91] WhatsApp send error:', err.message)
    return { sent: false, reason: err.message }
  }
}

/**
 * Check if MSG91 is configured (used by health endpoint).
 */
export function msg91Status() {
  return {
    sms_configured:       !!AUTH_KEY && !!OTP_TMPL,
    whatsapp_configured:  !!AUTH_KEY && !!WA_TMPL,
    auth_key_present:     !!AUTH_KEY,
  }
}
