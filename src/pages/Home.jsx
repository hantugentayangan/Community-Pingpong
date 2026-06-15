import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

const initialData = {
  ads: [],
  news: [],
  ptm: []
};

function Home({ appState }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHome() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const [adsResult, newsResult, ptmResult] = await Promise.all([
        supabase
          .from('ads')
          .select('id,title,description,image_url,photo_url,target_url,status')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(4),
        supabase
          .from('news')
          .select('id,title,summary,photo_url,status,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('ptm')
          .select('id,name,city_area,logo_url,description,status')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4)
      ]);

      if (!active) return;

      const firstError = adsResult.error || newsResult.error || ptmResult.error;
      if (firstError) {
        setError('Data publik belum bisa dimuat. Coba lagi nanti.');
      }

      setData({
        ads: adsResult.data || [],
        news: newsResult.data || [],
        ptm: ptmResult.data || []
      });
      setLoading(false);
    }

    loadHome();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Portal komunitas tenis meja Indonesia</h1>
          <p>
            Satu tempat untuk melihat berita, PTM, iklan komunitas, dan database anggota
            yang dikelola dengan Supabase.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/ptm">
              Lihat PTM
            </Link>
            <Link className="button secondary" to="/news">
              Baca Berita
            </Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Ringkasan fitur">
          <div>
            <strong>Supabase</strong>
            <span>Auth, database, storage</span>
          </div>
          <div>
            <strong>Netlify</strong>
            <span>Hosting frontend cepat</span>
          </div>
          <div>
            <strong>Komunitas</strong>
            <span>PTM, pemain, berita, marketplace</span>
          </div>
        </div>
      </section>

      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="state-panel">Memuat data publik...</div>}

      {!loading && (
        <>
          <section className="section">
            <div className="section-heading">
              <h2>Iklan Aktif</h2>
              <p>Informasi sponsor, marketplace, produk, dan agenda komunitas.</p>
            </div>
            <div className="grid three">
              {data.ads.length ? (
                data.ads.map((ad) => (
                  <a
                    className="content-card"
                    href={ad.target_url || '#'}
                    target={ad.target_url ? '_blank' : undefined}
                    rel={ad.target_url ? 'noopener noreferrer' : undefined}
                    key={ad.id}
                  >
                    <CardImage src={ad.photo_url || ad.image_url} alt={ad.title} />
                    <h3>{ad.title}</h3>
                    <p>{ad.description || 'Detail iklan belum tersedia.'}</p>
                  </a>
                ))
              ) : (
                <EmptyState text="Belum ada iklan aktif." />
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>Berita Terbaru</h2>
              <Link to="/news">Lihat semua berita</Link>
            </div>
            <div className="grid three">
              {data.news.length ? (
                data.news.map((item) => (
                  <Link className="content-card" to={`/news/${item.id}`} key={item.id}>
                    <CardImage src={item.photo_url} alt={item.title} />
                    <h3>{item.title}</h3>
                    <p>{item.summary || 'Ringkasan berita belum tersedia.'}</p>
                  </Link>
                ))
              ) : (
                <EmptyState text="Belum ada berita published." />
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>PTM Terverifikasi</h2>
              <Link to="/ptm">Lihat semua PTM</Link>
            </div>
            <div className="grid four">
              {data.ptm.length ? (
                data.ptm.map((ptm) => (
                  <article className="mini-card" key={ptm.id}>
                    <CardImage src={ptm.logo_url} alt={ptm.name} compact />
                    <h3>{ptm.name}</h3>
                    <p>{ptm.city_area || 'Area belum diisi'}</p>
                  </article>
                ))
              ) : (
                <EmptyState text="Belum ada PTM approved." />
              )}
            </div>
          </section>
        </>
      )}

      {!appState.isSupabaseConfigured && (
        <section className="section">
          <EmptyState text="Mode aman aktif karena env Supabase belum disiapkan." />
        </section>
      )}
    </main>
  );
}

function CardImage({ src, alt, compact = false }) {
  if (!src) {
    return <div className={compact ? 'image-placeholder compact' : 'image-placeholder'} />;
  }

  return (
    <img
      className={compact ? 'card-image compact' : 'card-image'}
      src={src}
      alt={alt || ''}
      loading="lazy"
    />
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

export default Home;
