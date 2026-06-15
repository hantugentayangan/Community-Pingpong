import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('news')
        .select('id,title,summary,content,photo_url,status,created_at')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (!active) return;
      setItem(data);
      setError(queryError ? 'Detail berita belum bisa dimuat.' : '');
      setLoading(false);
    }

    loadDetail();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="page article-page">
      <Link className="text-link" to="/news">
        Kembali ke berita
      </Link>
      {loading && <div className="state-panel">Memuat detail berita...</div>}
      {error && <div className="inline-error">{error}</div>}
      {!loading && !item && <div className="empty-state">Berita tidak ditemukan.</div>}
      {item && (
        <article className="article">
          {item.photo_url && <img className="article-image" src={item.photo_url} alt={item.title} />}
          <h1>{item.title}</h1>
          <p className="article-summary">{item.summary}</p>
          <div className="article-content">{item.content || 'Konten berita belum tersedia.'}</div>
        </article>
      )}
    </main>
  );
}

export default NewsDetail;
