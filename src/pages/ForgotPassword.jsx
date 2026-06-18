import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getAuthRedirectUrl } from '../lib/communityData'
import ittcLogo from '../assets/ittc-logo.jpeg'

export default function ForgotPassword({ appState = { isSupabaseConfigured: Boolean(supabase) } }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!supabase) {
      setError('Supabase belum dikonfigurasi.')
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl('/reset-password'),
    })
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('Jika email terdaftar, link reset password sudah dikirim. Silakan cek inbox atau spam.')
  }

  return (
    <main className="ttc-auth-page login-auth-page">
      <section className="ttc-auth-visual auth-hero-photo" aria-hidden="true"></section>

      <section className="auth-card ttc-form-card">
        <div className="auth-logo">
          <img src={ittcLogo} alt="Indonesian Table Tennis Community" />
        </div>
        <span className="ttc-form-accent"></span>
        <h1>Reset Password</h1>
        <p>Masukkan email akun Anda untuk menerima link reset password.</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Email
            <input
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Link Reset'}
          </button>
        </form>
        {message && <div className="inline-info">{message}</div>}
        {error && <div className="inline-error">{error}</div>}
        <p className="small-text">
          Sudah ingat password? <Link to="/login">Kembali ke login</Link>
        </p>
      </section>
    </main>
  )
}
