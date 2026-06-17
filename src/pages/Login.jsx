import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import ittcLogo from '../assets/ittc-logo.jpeg';

function Login({ appState = { isSupabaseConfigured: Boolean(supabase) } }) {
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
    <main className="ttc-auth-page login-auth-page">
      <section className="ttc-auth-visual" aria-hidden="true">
        <div className="auth-ball"></div>
        <div className="auth-paddle"></div>
        <div className="auth-streak one"></div>
        <div className="auth-streak two"></div>
      </section>

      <section className="auth-card ttc-form-card">
        <div className="auth-logo">
          <img src={ittcLogo} alt="Indonesian Table Tennis Community" />
        </div>
        <span className="ttc-form-accent"></span>
        <h1>Welcome Back!</h1>
        <p>Login to your account</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Email or Username
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <div className="auth-options">
            <label className="remember-row">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Login'}
          </button>
        </form>
        {message && <div className="inline-error">{message}</div>}
        <p className="small-text">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
