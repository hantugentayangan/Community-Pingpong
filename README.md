# Community Pingpong

Community Pingpong adalah fondasi awal aplikasi web komunitas tenis meja Indonesia. Aplikasi ini menggantikan versi lama berbasis Google Sites / Apps Script dengan arsitektur yang lebih siap produksi:

- Supabase untuk database, authentication, storage, dan API.
- Netlify untuk hosting frontend.
- GitHub untuk source repository.
- Vite + React untuk frontend.

## Stack

- Vite
- React
- React Router
- Supabase JavaScript Client
- CSS plain
- Netlify

## Setup Lokal

Install dependency:

```bash
npm install
```

Buat file `.env` lokal sendiri berdasarkan `.env.example`:

```bash
cp .env.example .env
```

Isi environment variable:

```bash
VITE_SUPABASE_URL=https://jjhuvlmmyejdwtjauesm.supabase.co
VITE_SUPABASE_ANON_KEY=isi_anon_public_key_supabase
```

Jangan commit file `.env`.

## Run Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy ke Netlify

Di Netlify, set environment variables berikut:

```bash
VITE_SUPABASE_URL=https://jjhuvlmmyejdwtjauesm.supabase.co
VITE_SUPABASE_ANON_KEY=
```

Lalu gunakan konfigurasi build:

- Build command: `npm run build`
- Publish directory: `dist`

File `netlify.toml` sudah menyiapkan redirect SPA ke `index.html`.

## Catatan Keamanan

- Jangan pernah expose `SUPABASE_SERVICE_ROLE_KEY` di frontend.
- Jangan commit database password, SMTP password, email password, Gmail password, atau secret key apa pun.
- Frontend hanya boleh memakai Supabase URL dan anon public key.
- Semua operasi yang membutuhkan privilege tinggi harus dikerjakan di backend/server function pada tahap berikutnya.

## Scope Saat Ini

Fondasi ini hanya mencakup frontend awal dan kesiapan deploy Netlify:

- Public Home
- Login/Register Supabase Auth
- Profile loading
- ProtectedRoute
- RoleGate
- Berita list/detail
- PTM list
- My PTM placeholder
- Admin dashboard count cards

Belum termasuk:

- Pembuatan tabel Supabase
- Perubahan RLS
- Email backend
- Full admin CRUD
- Workflow approval PTM
