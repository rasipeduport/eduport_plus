import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Compass, Presentation, ExternalLink, RefreshCw, LogOut, Loader2, ArrowRight } from 'lucide-react';
import api from './lib/api';

// Configurable Hub URL for redirecting staff roles
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3000';

// Simple Auth Context
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me/');
      const userData = response.data.user;
      setUser(userData);
      
      // If staff logs into Learn, redirect them to the Hub portal
      if (userData.role !== 'STUDENT') {
        window.location.href = HUB_URL;
        return;
      }

      // Check student profile linking status
      try {
        await api.get('/api/student/dashboard/');
        // Linked successfully
        if (location.pathname === '/waiting-room' || location.pathname === '/login') {
          navigate('/dashboard');
        }
      } catch (err) {
        if (err.response?.data?.error === 'STUDENT_PROFILE_NOT_FOUND') {
          if (location.pathname !== '/waiting-room') {
            navigate('/waiting-room');
          }
        }
      }
    } catch (error) {
      setUser(null);
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [location.pathname]);

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-zinc-400 font-medium">Loading Eduport Plus...</p>
        </div>
      </div>
    );
  }

  return children({ user, logout });
}

// Header & Layout Component
function HeaderLayout({ user, logout, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <header className="h-16 bg-[#0a0a0c] border-b border-[#1e1e24] flex items-center justify-between px-8 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            E+
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white m-0">Eduport Plus</h1>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Learn</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full bg-zinc-800 object-cover border border-[#27272a]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-white">
                {user?.full_name?.charAt(0) || 'S'}
              </div>
            )}
            <p className="text-sm font-semibold text-slate-200 hidden md:block m-0">{user?.full_name}</p>
          </div>
          <button
            onClick={logout}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

// Login Component (Premium Dark Theme Center Card)
function Login() {
  const [error, setError] = useState('');
  const [mockEmail, setMockEmail] = useState('');
  const [mockName, setMockName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [showMock, setShowMock] = useState(false);

  useEffect(() => {
    const initGsi = () => {
      if (window.google) {
        setGsiLoaded(true);
        const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { 
            theme: 'filled_black', 
            size: 'large', 
            width: '320', 
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left'
          }
        );
        window.google.accounts.id.prompt(); // Trigger Google One Tap
      }
    };

    if (window.google) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initGsi();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/google/', { credential: response.credential });
      if (res.data.user.role !== 'STUDENT') {
        window.location.href = HUB_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify student invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInFallback = () => {
    if (!window.google) {
      const email = prompt('Enter Google Whitelisted Student Email to simulate login:');
      if (email) {
        setMockEmail(email);
        const mockCredential = `mock:${email}:Test Student:https://api.dicebear.com/7.x/adventurer/svg?seed=TestStudent`;
        setLoading(true);
        api.post('/api/auth/google/', { credential: mockCredential })
          .then((res) => {
            if (res.data.user.role !== 'STUDENT') {
              window.location.href = HUB_URL;
            } else {
              window.location.href = '/dashboard';
            }
          })
          .catch((err) => {
            setError(err.response?.data?.message || 'Authentication failed. Whitelist invitation required.');
            setLoading(false);
          });
      }
    }
  };

  const handleMockLogin = async (e) => {
    e.preventDefault();
    if (!mockEmail.trim()) {
      setError('Please provide a mock email address.');
      return;
    }
    const name = mockName.trim() || mockEmail.split('@')[0];
    const mockCredential = `mock:${mockEmail}:${name}:https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/google/', { credential: mockCredential });
      if (res.data.user.role !== 'STUDENT') {
        window.location.href = HUB_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Whitelist invitation required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070708] px-4 font-sans text-zinc-100">
      <div className="w-full max-w-[400px] bg-[#121214] border border-[#1e1e24] rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-bold text-white tracking-tight cursor-pointer select-none" 
            onDoubleClick={() => setShowMock(prev => !prev)}
            title="Double-click to toggle Developer Mock Access"
          >
            Welcome!
          </h2>
          <p className="text-zinc-400 mt-2 text-sm leading-normal">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="w-full bg-red-950/50 text-red-400 text-xs p-3 rounded-lg mb-6 border border-red-900/50">
            {error}
          </div>
        )}

        <div className="w-full space-y-6 flex flex-col items-center">
          {gsiLoaded ? (
            /* Real Google Sign In container */
            <div id="google-signin-btn" className="w-full flex justify-center"></div>
          ) : (
            /* Custom Google Pill button Fallback */
            <button
              onClick={handleGoogleSignInFallback}
              className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 font-semibold h-11 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors duration-150 text-sm shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.055 15.045 0 12 0 7.354 0 3.373 2.668 1.445 6.555L5.266 9.765z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.275c0-.818-.073-1.609-.209-2.373H12v4.5h6.49c-.282 1.482-1.12 2.74-2.38 3.59l3.7 2.87c2.164-1.99 3.68-4.927 3.68-8.587z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235L1.445 17.44A11.97 11.97 0 0 0 12 24c3.055 0 5.864-1.01 7.91-2.74l-3.7-2.87c-1.145.764-2.618 1.218-4.21 1.218-3.136 0-5.8-2.127-6.734-5.373z"
                />
                <path
                  fill="#34A853"
                  d="M1.445 6.555A11.996 11.996 0 0 0 0 12c0 1.99.49 3.864 1.445 5.445l3.821-3.205C4.945 13.127 4.909 12.573 4.909 12c0-.573.036-1.127.127-1.682L1.445 6.555z"
                />
              </svg>
              Continue with Google
            </button>
          )}

          {showMock && (
            <div className="w-full space-y-6">
              <div className="w-full relative flex items-center justify-center py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1e1e24]"></div>
                </div>
                <span className="relative px-3 bg-[#121214] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Student Mock Login
                </span>
              </div>

              <form onSubmit={handleMockLogin} className="w-full space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Whitelisted Email</label>
                  <input
                    type="email"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    placeholder="student.jane@gmail.com"
                    className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Name</label>
                  <input
                    type="text"
                    value={mockName}
                    onChange={(e) => setMockName(e.target.value)}
                    placeholder="Jane Student"
                    className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Log In as Student
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Student Dashboard View
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/api/student/dashboard/');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load student dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#09090b]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg border border-indigo-950">
        <div className="relative z-10">
          <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest block">Dashboard</span>
          <h2 className="text-3xl font-extrabold text-white mt-1.5 m-0">Welcome back, {stats?.student_name}!</h2>
          <p className="text-indigo-100 mt-2.5 text-sm max-w-md leading-relaxed">
            Great to see you today. Here is an overview of your class status and assigned mentor contact.
          </p>
        </div>
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 blur-xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quota Indicator */}
        <div className="bg-[#121214] border border-[#1e1e24] p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-950/20 text-indigo-400 rounded-xl border border-indigo-900/50">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Class Credits</span>
          </div>
          <div className="mt-4">
            <h3 className="text-4xl font-extrabold text-white m-0">{stats?.quota ?? 0}</h3>
            <p className="text-xs text-zinc-500 mt-1 m-0">Remaining classes in your quota</p>
          </div>
        </div>

        {/* Mentor Card */}
        <div className="bg-[#121214] border border-[#1e1e24] p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-950/20 text-sky-400 rounded-xl border border-sky-900/50">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Mentor</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-white m-0">{stats?.mentor || 'Not Assigned'}</h3>
            <p className="text-xs text-zinc-500 mt-1 m-0">Academic Guidance & Planning</p>
          </div>
        </div>

        {/* Tutor Card */}
        <div className="bg-[#121214] border border-[#1e1e24] p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950/20 text-emerald-400 rounded-xl border border-emerald-900/50">
              <Presentation className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Tutor</span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-bold text-white m-0">{stats?.tutor || 'Not Assigned'}</h3>
            <p className="text-xs text-zinc-500 mt-1 m-0">One-on-One Live Instructor</p>
          </div>
        </div>
      </div>

      {/* Google Meet Live Class Action */}
      {stats?.meet_link && (
        <div className="bg-[#121214] border border-[#1e1e24] rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white m-0">Join Your Live Class</h3>
            <p className="text-sm text-zinc-500 m-0">Google Meet link is configured and open for your sessions.</p>
          </div>
          <a
            href={stats.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 h-12 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-md transition-colors w-full md:w-auto justify-center"
          >
            Enter Classroom
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

// Waiting Room Page (Premium Dark Centered Card)
function WaitingRoom({ logout }) {
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const response = await api.get('/api/auth/me/');
      const userData = response.data.user;
      
      // Try fetching dashboard stats
      await api.get('/api/student/dashboard/');
      navigate('/dashboard');
    } catch (err) {
      console.log('Linking pending...');
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070708] font-sans text-zinc-100">
      <header className="h-16 bg-[#0a0a0c] border-b border-[#1e1e24] flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            E+
          </div>
          <h1 className="font-bold text-sm text-white m-0">Eduport Plus</h1>
        </div>
        <button onClick={logout} className="text-zinc-400 hover:text-white transition-colors" title="Log Out">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#121214] border border-[#1e1e24] rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white m-0">Account Verification</h2>
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
            We are setting up your student profile! Your account details are currently waiting to be linked with your student records.
          </p>

          <div className="bg-[#1a1a1e] border border-[#27272a] rounded-xl p-5 mt-6 text-left space-y-2">
            <h4 className="text-sm font-bold text-white m-0">Need assistance?</h4>
            <p className="text-xs text-zinc-400 leading-normal m-0">
              Please contact your assigned <strong className="text-white">mentor</strong> to speed up this process. If you aren't sure who they are, reach out to our WhatsApp support team.
            </p>
            <a
              href="https://wa.me/971585982494?text=Hi! I am waiting to be verified on Eduport Plus."
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 font-semibold hover:underline block pt-1"
            >
              Contact Support via WhatsApp
            </a>
          </div>

          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full h-11 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md transition-colors mt-8 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check Status'}
          </button>
        </div>
      </main>
    </div>
  );
}

// Router Entry App
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthProvider>
              {({ user, logout }) => (
                <Routes>
                  <Route path="/dashboard" element={<HeaderLayout user={user} logout={logout}><Dashboard /></HeaderLayout>} />
                  <Route path="/waiting-room" element={<WaitingRoom logout={logout} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              )}
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
