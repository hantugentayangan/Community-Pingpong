const EMAIL_TYPES = new Set([
  'NEW_USER_REGISTERED',
  'PROFILE_UPDATED',
  'PTM_VERIFICATION_NEEDED',
  'PLAYER_VERIFICATION_RESULT',
  'PTM_VERIFICATION_RESULT',
])

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
})

const getEnv = (key) => globalThis.Netlify?.env?.get?.(key) || ''

export default async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405)
  }

  let payload
  try {
    payload = await req.json()
  } catch (_error) {
    return jsonResponse({ ok: false, message: 'Invalid JSON payload' }, 400)
  }

  const type = String(payload?.type || '').trim()
  const subject = String(payload?.subject || '').trim().slice(0, 180)
  const message = String(payload?.message || '').trim().slice(0, 5000)
  const to = String(payload?.to || getEnv('ADMIN_NOTIFICATION_EMAIL') || '').trim()
  const from = String(getEnv('NOTIFICATION_FROM_EMAIL') || '').trim()
  const apiKey = String(getEnv('RESEND_API_KEY') || '').trim()

  if (!EMAIL_TYPES.has(type)) {
    return jsonResponse({ ok: false, message: 'Unsupported notification type' }, 400)
  }

  if (!subject || !message) {
    return jsonResponse({ ok: false, message: 'Subject and message are required' }, 400)
  }

  if (!apiKey || !from || !to) {
    return jsonResponse({
      ok: false,
      disabled: true,
      message: 'Email provider is not configured',
      requiredEnv: ['RESEND_API_KEY', 'NOTIFICATION_FROM_EMAIL', 'ADMIN_NOTIFICATION_EMAIL'],
    })
  }

  const safeData = payload?.data && typeof payload.data === 'object'
    ? JSON.stringify(payload.data, null, 2).slice(0, 6000)
    : '{}'

  const text = [
    message,
    '',
    'Detail:',
    safeData,
  ].join('\n')

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  })

  const result = await resendResponse.json().catch(() => ({}))
  if (!resendResponse.ok) {
    return jsonResponse({
      ok: false,
      message: result?.message || 'Email notification failed',
    }, 502)
  }

  return jsonResponse({ ok: true, id: result?.id || null })
}

export const config = {
  method: ['POST'],
}
