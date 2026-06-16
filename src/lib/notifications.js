const NOTIFICATION_ENDPOINT = '/.netlify/functions/send-notification'

export async function sendNotification(type, payload = {}) {
  if (!type || typeof fetch !== 'function') return { ok: false, skipped: true }

  try {
    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        to: payload.to || '',
        subject: payload.subject || subjectForType(type),
        message: payload.message || '',
        data: payload.data || {},
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.disabled) {
      console.warn('Email notification skipped:', result.message || response.statusText)
    }
    return result
  } catch (error) {
    console.warn('Email notification failed:', error?.message)
    return { ok: false, error: error?.message || 'notification_failed' }
  }
}

function subjectForType(type) {
  const subjects = {
    NEW_USER_REGISTERED: 'Pendaftaran User Baru - Table Tennis Community',
    PROFILE_UPDATED: 'Update Profile Pemain - Table Tennis Community',
    PTM_VERIFICATION_NEEDED: 'Verifikasi PTM/Club Diperlukan',
    PLAYER_VERIFICATION_RESULT: 'Status Verifikasi Pemain Anda',
    PTM_VERIFICATION_RESULT: 'Status Verifikasi PTM Anda',
  }
  return subjects[type] || 'Notifikasi Table Tennis Community'
}
