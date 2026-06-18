import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ittcLogo from '../assets/ittc-logo.jpeg'

export default function ResetPassword({ appState = { isSupabaseConfigured: Boolean(supabase) } }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
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

    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Konfirmasi password belum sama.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage('Password berhasil diperbarui. Anda akan diarahkan ke login.')
    setTimeout(() => navigate('/login'), 1200)
  }

  return (
    <main className="ttc-auth-page login-auth-page">
      <section className="ttc-auth-visual auth-hero-photo" aria-hidden="true"></section>

      <section className="auth-card ttc-form-card">
        <div className="auth-logo">
          <img src={ittcLogo} alt="Indonesian Table Tennis Community" />
        </div>
        <span className="ttc-form-accent"></span>
        <h1>Buat Password Baru</h1>
        <p>Masukkan password baru setelah membuka link reset dari email.</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Password Baru
            <input
              type="password"
              minLength={8}
              placeholder="Minimal 8 karakter"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <label>
            Konfirmasi Password
            <input
              type="password"
              minLength={8}
              placeholder="Ulangi password baru"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
        {message && <div className="inline-info">{message}</div>}
        {error && <div className="inline-error">{error}</div>}
        <p className="small-text">
          Link sudah dipakai? <Link to="/forgot-password">Kirim ulang reset password</Link>
        </p>
      </section>
    </main>
  )
}
