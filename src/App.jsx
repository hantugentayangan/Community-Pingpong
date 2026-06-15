import { useCallback, useEffect, useMemo, useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleGate from './components/RoleGate.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import MyProfile from './pages/MyProfile.jsx';
import MyPTM from './pages/MyPTM.jsx';
import NewsDetail from './pages/NewsDetail.jsx';
import NewsList from './pages/NewsList.jsx';
import PTMList from './pages/PTMList.jsx';
import Register from './pages/Register.jsx';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadProfile = useCallback(async (currentUser) => {
    if (!supabase || !currentUser) {
      setProfile(null);
      setProfileError('');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setProfileError('Profil belum bisa dimuat. Coba refresh halaman atau hubungi admin.');
      return;
    }

    setProfile(data);
    setProfileError('');
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      if (!supabase) {
        setLoadingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      if (active) setLoadingSession(false);
    }

    boot();

    if (!supabase) return () => {
      active = false;
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      setLoadingSession(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const appState = useMemo(
    () => ({
      user,
      profile,
      loadingSession,
      profileError,
      isSupabaseConfigured
    }),
    [user, profile, loadingSession, profileError]
  );

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    navigate('/');
  }

  return (
    <>
      <Navbar user={user} profile={profile} onLogout={handleLogout} />
      {!isSupabaseConfigured && (
        <div className="config-warning">
          Supabase belum dikonfigurasi. Isi environment variable VITE_SUPABASE_URL dan
          VITE_SUPABASE_ANON_KEY.
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home appState={appState} />} />
        <Route path="/login" element={<Login appState={appState} />} />
        <Route path="/register" element={<Register appState={appState} />} />
        <Route path="/news" element={<NewsList appState={appState} />} />
        <Route path="/news/:id" element={<NewsDetail appState={appState} />} />
        <Route path="/ptm" element={<PTMList appState={appState} />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user} profile={profile} loading={loadingSession}>
              <MyProfile appState={appState} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-ptm"
          element={
            <ProtectedRoute user={user} profile={profile} loading={loadingSession}>
              <RoleGate
                profile={profile}
                allowedRoles={['ketua_ptm', 'pengurus_ptm', 'admin', 'super_admin']}
              >
                <MyPTM appState={appState} />
              </RoleGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} profile={profile} loading={loadingSession}>
              <RoleGate profile={profile} allowedRoles={['admin', 'super_admin']}>
                <AdminDashboard appState={appState} />
              </RoleGate>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
