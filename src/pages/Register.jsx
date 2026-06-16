import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {
  DIVISIONS,
  DUPLICATE_IDENTITY_MESSAGE,
  assertIdentityNumberAvailable,
  cleanDigits,
  getAuthRedirectUrl,
  getOrCreateProfile,
  syncPlayerFromProfile,
  validateNikWithBirthDate,
} from '../lib/communityData.js';
import { sendNotification } from '../lib/notifications.js';

function Register({ appState = { isSupabaseConfigured: Boolean(supabase) } }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    nik: '',
    birthDate: '',
    division: 'Divisi 11'
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

    const nikValidation = validateNikWithBirthDate(form.nik, form.birthDate);
    if (!nikValidation.valid) {
      setMessage(nikValidation.message);
      return;
    }

    const nik = cleanDigits(form.nik);
    setLoading(true);
    try {
      await assertIdentityNumberAvailable(nik);

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
          data: {
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
            identity_number: nik,
            ktp_nik: nik,
            birth_date: form.birthDate,
            division: form.division,
            ptm_status: 'Tidak tergabung PTM'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const registerPayload = {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          nik,
          birthDate: form.birthDate,
          division: form.division,
          ptm_status: 'Tidak tergabung PTM'
        };

        let syncedProfile = null;
        let playerSynced = false;
        let syncWarning = '';

        if (data.session) {
          try {
            syncedProfile = await getOrCreateProfile(data.user, registerPayload);
            await syncPlayerFromProfile(syncedProfile, registerPayload);
            playerSynced = true;
          } catch (syncError) {
            syncWarning = syncError?.message || 'Profil pemain belum tersinkron. Cek policy/RLS profiles dan players.';
            console.warn('Register player sync failed:', syncWarning);
          }
        }

        await sendNotification('NEW_USER_REGISTERED', {
          subject: 'Pendaftaran User Baru - Table Tennis Community',
          message: `${form.fullName.trim()} mendaftar sebagai pemain ${form.division}.`,
          data: {
            email: form.email.trim(),
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
            division: form.division,
            profile_created: Boolean(syncedProfile?.id),
            player_synced: playerSynced,
          },
        });

        if (syncWarning) {
          setMessage(`Akun berhasil dibuat, tetapi data pemain belum tersinkron: ${syncWarning}`);
          return;
        }
      }

      setMessage(data.session
        ? 'Registrasi berhasil. Profil pemain dibuat dan menunggu verifikasi admin.'
        : 'Registrasi berhasil. Jika email confirmation aktif, silakan cek email lalu login untuk melengkapi profil pemain.');
    } catch (error) {
      const isDuplicate = /duplicate|unique|identity_number/i.test(error?.message || '');
      setMessage(isDuplicate ? DUPLICATE_IDENTITY_MESSAGE : error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ttc-auth-page register-auth-page">
      <section className="ttc-auth-visual" aria-hidden="true">
        <div className="auth-ball"></div>
        <div className="auth-paddle"></div>
        <div className="auth-streak one"></div>
        <div className="auth-streak two"></div>
      </section>

      <section className="auth-card ttc-form-card">
        <span className="ttc-form-accent"></span>
        <h1>Create Account</h1>
        <p>Join our table tennis community</p>
        {!appState.isSupabaseConfigured && (
          <div className="inline-error">Environment Supabase belum tersedia.</div>
        )}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            Full Name
            <input
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
          </label>
          <label>
            WhatsApp / Phone
            <input
              placeholder="Enter contact number"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            No KTP/NIK
            <input
              inputMode="numeric"
              maxLength={16}
              placeholder="16 digit NIK"
              value={form.nik}
              onChange={(event) => setForm((current) => ({ ...current, nik: cleanDigits(event.target.value).slice(0, 16) }))}
              required
            />
          </label>
          <label>
            Tanggal Lahir
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
              required
            />
          </label>
          <label>
            Divisi Pemain
            <select
              value={form.division}
              onChange={(event) => setForm((current) => ({ ...current, division: event.target.value }))}
              required
            >
              {DIVISIONS.map((division) => (
                <option key={division} value={division}>
                  {division}{division === 'Divisi 1' ? ' - profesional' : division === 'Divisi 11' ? ' - pemula' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={8}
              placeholder="Create a password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        {message && <div className="inline-info">{message}</div>}
        <p className="small-text">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
