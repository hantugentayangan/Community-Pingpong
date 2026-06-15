import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

function Register({ appState }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage('Supabase belum dikonfigurasi.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone
        }
      }
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Registrasi berhasil. Akun Anda masih menunggu approval admin jika approval diaktifkan.');
  }

  return (
    <main className="page narrow-page">
      <section className="auth-card">
        <h1>Daftar Akun</h1>
        <p>Daftar sebagai anggota komunitas. Admin dapat melakukan approval sesuai kebijakan.</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Nama Lengkap
            <input
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
          </label>
          <label>
            No WhatsApp / Telepon
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Mendaftarkan...' : 'Daftar'}
          </button>
        </form>
        {message && <div className="inline-info">{message}</div>}
        <p className="small-text">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
