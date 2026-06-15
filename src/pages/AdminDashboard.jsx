import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const cards = [
  { key: 'totalProfiles', label: 'Total Profiles' },
  { key: 'pendingUsers', label: 'Pending Users' },
  { key: 'totalPTM', label: 'Total PTM' },
  { key: 'pendingPTM', label: 'Pending PTM' },
  { key: 'totalPlayers', label: 'Total Players' },
  { key: 'pendingPlayers', label: 'Pending Players' },
  { key: 'totalNews', label: 'Total News' },
  { key: 'activeAds', label: 'Active Ads' }
];

function AdminDashboard() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function count(table, filter) {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { count: total, error: queryError } = await query;
      if (queryError) throw queryError;
      return total || 0;
    }

    async function loadCounts() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const [
          totalProfiles,
          pendingUsers,
          totalPTM,
          pendingPTM,
          totalPlayers,
          pendingPlayers,
          totalNews,
          activeAds
        ] = await Promise.all([
          count('profiles'),
          count('profiles', { column: 'status', value: 'pending' }),
          count('ptm'),
          count('ptm', { column: 'status', value: 'pending' }),
          count('players'),
          count('players', { column: 'status', value: 'pending' }),
          count('news'),
          count('ads', { column: 'status', value: 'active' })
        ]);

        if (!active) return;
        setCounts({
          totalProfiles,
          pendingUsers,
          totalPTM,
          pendingPTM,
          totalPlayers,
          pendingPlayers,
          totalNews,
          activeAds
        });
      } catch (queryError) {
        if (active) setError('Statistik admin belum bisa dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCounts();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <div className="page-heading">
        <h1>Admin Dashboard</h1>
        <p>Ringkasan awal data Community Pingpong dari Supabase.</p>
      </div>
      {loading && <div className="state-panel">Memuat statistik admin...</div>}
      {error && <div className="inline-error">{error}</div>}
      <div className="metrics-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{counts[card.key] ?? 0}</strong>
          </article>
        ))}
      </div>
    </main>
  );
}

export default AdminDashboard;
