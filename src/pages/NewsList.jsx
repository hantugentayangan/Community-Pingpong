import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

function NewsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadNews() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('news')
        .select('id,title,summary,photo_url,status,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!active) return;
      setItems(data || []);
      setError(queryError ? 'Berita belum bisa dimuat.' : '');
      setLoading(false);
    }

    loadNews();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <div className="page-heading">
        <h1>Berita Komunitas</h1>
        <p>Berita published dari pengurus komunitas tenis meja.</p>
      </div>
      {loading && <div className="state-panel">Memuat berita...</div>}
      {error && <div className="inline-error">{error}</div>}
      {!loading && !items.length && <div className="empty-state">Belum ada berita published.</div>}
      <div className="grid three">
        {items.map((item) => (
          <Link className="content-card" to={`/news/${item.id}`} key={item.id}>
            {item.photo_url ? (
              <img className="card-image" src={item.photo_url} alt={item.title} loading="lazy" />
            ) : (
              <div className="image-placeholder" />
            )}
            <h2>{item.title}</h2>
            <p>{item.summary || 'Ringkasan berita belum tersedia.'}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default NewsList;
