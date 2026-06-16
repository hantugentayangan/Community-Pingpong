import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { getImageUrl } from '../lib/storageImages.js';

function PTMList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPTM() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('ptm')
        .select('id,name,city_area,logo_url,description,status')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!active) return;
      setItems(data || []);
      setError(queryError ? 'Daftar PTM belum bisa dimuat.' : '');
      setLoading(false);
    }

    loadPTM();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <div className="page-heading">
        <h1>PTM Terverifikasi</h1>
        <p>Daftar PTM approved yang dapat dilihat publik.</p>
      </div>
      {loading && <div className="state-panel">Memuat PTM...</div>}
      {error && <div className="inline-error">{error}</div>}
      {!loading && !items.length && <div className="empty-state">Belum ada PTM approved.</div>}
      <div className="grid three">
        {items.map((ptm) => (
          <article className="content-card" key={ptm.id}>
            {getImageUrl(ptm.logo_url) ? (
              <img className="card-image compact" src={getImageUrl(ptm.logo_url)} alt={ptm.name} loading="lazy" />
            ) : (
              <div className="image-placeholder compact" />
            )}
            <h2>{ptm.name}</h2>
            <p className="muted">{ptm.city_area || 'Area belum diisi'}</p>
            <p>{ptm.description || 'Deskripsi PTM belum tersedia.'}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

export default PTMList;
