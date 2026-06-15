import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

function Login({ appState }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
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
    const { error } = await supabase.auth.signInWithPassword(form);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    navigate('/');
  }

  return (
    <main className="page narrow-page">
      <section className="auth-card">
        <h1>Masuk</h1>
        <p>Gunakan akun internal Supabase Auth Community Pingpong.</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
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
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        {message && <div className="inline-error">{message}</div>}
        <p className="small-text">
          Belum punya akun? <Link to="/register">Daftar akun baru</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
