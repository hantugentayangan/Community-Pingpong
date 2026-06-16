import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { getImageUrl } from '../lib/storageImages.js';

function NewsDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');
  const imageUrl = getImageUrl(item?.photo_url);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .in('status', ['published', 'active'])
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
    <main className="ttc-page ttc-news-detail-page">
      <Link className="ttc-row-action secondary-link" to="/news">
        Kembali ke berita
      </Link>
      {loading && <div className="ttc-state">Memuat detail berita...</div>}
      {error && <div className="inline-error">{error}</div>}
      {!loading && !item && <div className="ttc-state">Berita tidak ditemukan.</div>}
      {item && (
        <article className="ttc-modal-card public-detail-modal wide news-detail-card">
          {imageUrl && (
            <div className="news-detail-hero-image">
              <img src={imageUrl} alt={item.title} style={{ objectPosition: item.photo_position || 'center center' }} />
            </div>
          )}
          <div className="news-detail-content standalone">
            <div className="ttc-item-kicker">
              {item.category && <span>{item.category}</span>}
              <time>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Latest update'}</time>
            </div>
            <h1>{item.title}</h1>
            {item.summary && <p className="news-detail-summary">{item.summary}</p>}
            <div className="news-detail-text">{item.content || 'Konten berita belum tersedia.'}</div>
          </div>
        </article>
      )}
    </main>
  );
}

export default NewsDetail;
