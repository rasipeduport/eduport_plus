import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Compass, Presentation, Mail, Plus, Check, LogOut, Loader2, ArrowRight, ShieldCheck, ShieldAlert, Info, ChevronsUpDown, Sun, Moon, Monitor } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import api from './lib/api';
import StudentsPage from './components/StudentsPage';
import InvitationsPage from './components/InvitationsPage';
import AdminsPage from './components/AdminsPage';
import MentorsPage from './components/MentorsPage';
import TutorsPage from './components/TutorsPage';

// Configurable Learn URL for redirecting student role
const LEARN_URL = import.meta.env.VITE_LEARN_URL || 'http://localhost:3001';

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
      
      // If student logs into Hub, redirect them to the Learn portal
      if (userData.role === 'STUDENT') {
        window.location.href = LEARN_URL;
        return;
      }

      // If logged in and on login page, redirect to dashboard
      if (location.pathname === '/login') {
        navigate('/dashboard');
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

// Protected Layout with Sidebar
function SidebarLayout({ user, logout, children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Students', path: '/students', icon: GraduationCap },
    { title: 'Sessions', path: '/sessions', icon: Presentation },
    { title: 'Admins', path: '/admins', icon: ShieldCheck },
    { title: 'Mentors', path: '/mentors', icon: Compass },
    { title: 'Tutors', path: '/tutors', icon: Presentation },
    { title: 'Invitations', path: '/invitations', icon: Mail },
  ];

  const applyTheme = (currentTheme) => {
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (currentTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      if (systemTheme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    applyTheme(theme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-[#ffffff] font-sans antialiased transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-[rgba(255,255,255,0.08)] flex flex-col shrink-0 transition-colors duration-200">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2 px-4 border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0a0a0a] box-border transition-colors duration-200">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-[rgba(255,255,255,0.03)] flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-transparent">
            <img src="/icon-transparent.png" alt="E+" className="w-6 h-6 object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm leading-none text-zinc-900 dark:text-white m-0">Eduport Plus</h1>
            <span className="text-xs text-zinc-400 dark:text-[#a1a1aa] leading-none mt-0.5">Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
          {menuItems
            .filter((item) => {
              if (user?.role === 'TUTOR') {
                return ['/dashboard', '/students', '/sessions'].includes(item.path);
              }
              if (user?.role === 'MENTOR') {
                return ['/dashboard', '/students', '/sessions', '/tutors', '/mentors', '/invitations'].includes(item.path);
              }
              return true; // ADMIN see all
            })
            .map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-[rgba(255,255,255,0.08)] text-zinc-900 dark:text-white border border-zinc-200/60 dark:border-[rgba(255,255,255,0.08)]'
                      : 'text-zinc-600 dark:text-[#d4d4d8] hover:bg-zinc-50 dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-zinc-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
        </nav>

        {/* User Info / Logout Button and Dropdown */}
        <div className="p-3 border-t border-zinc-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[#0a0a0a] relative transition-colors duration-200" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-[72px] left-3 right-3 bg-white dark:bg-[#111112] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 flex flex-col gap-2 z-50 animate-fadeIn">
              {/* User profile details in popover */}
              <div className="flex items-center gap-2.5 px-1 py-1">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-lg bg-zinc-800 object-cover border border-zinc-200 dark:border-zinc-800" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-semibold text-white shrink-0 text-sm border border-zinc-700">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="overflow-hidden flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate leading-none">{user?.full_name}</span>
                    <span className="bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 shrink-0 rounded px-1 py-0.5 text-[10px] font-medium capitalize leading-none border border-zinc-200 dark:border-zinc-800">
                      {user?.role?.toLowerCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-[#a1a1aa] truncate block leading-none">{user?.email}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

              {/* Log out option */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors text-left font-medium group"
              >
                <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                Log out
              </button>

              {/* Divider */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />

              {/* Theme switcher segment control */}
              <div className="grid grid-cols-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-0.5">
                <button
                  type="button"
                  title="System Theme"
                  onClick={() => handleThemeChange('system')}
                  className={`flex items-center justify-center py-1.5 rounded-md transition-all ${
                    theme === 'system'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-800'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Light Theme"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center justify-center py-1.5 rounded-md transition-all ${
                    theme === 'light'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-800'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Dark Theme"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center justify-center py-1.5 rounded-md transition-all ${
                    theme === 'dark'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-800'
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Trigger button/card */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-[rgba(255,255,255,0.06)] bg-zinc-50/50 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer select-none text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-lg bg-zinc-850 object-cover border border-zinc-200 dark:border-[rgba(255,255,255,0.08)]" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-semibold text-white shrink-0 text-xs border border-zinc-700">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white truncate leading-none">{user?.full_name}</span>
                  <span className="bg-zinc-150 dark:bg-[#1e1e24] text-zinc-500 dark:text-[#a1a1aa] shrink-0 rounded px-1 py-px text-[10px] font-medium capitalize leading-none border border-zinc-200/50 dark:border-transparent">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-[#a1a1aa] truncate block leading-none">{user?.email}</span>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-[#050505] transition-colors duration-200">
        <header className="h-16 bg-white dark:bg-[#050505] border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)] flex items-center px-6 justify-between transition-colors duration-200">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white m-0">
            {location.pathname === '/dashboard' 
              ? 'Dashboard' 
              : location.pathname === '/students'
                ? 'Students'
                : location.pathname === '/admins'
                  ? 'Admins'
                  : location.pathname === '/mentors'
                    ? 'Mentors'
                    : location.pathname === '/tutors'
                      ? 'Tutors'
                      : 'Invitations'}
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-[#050505] transition-colors duration-200">{children}</main>
      </div>
    </div>
  );
}

// Global flag to track Google Sign-In initialization
let hubGsiInitialized = false;

// Login Page - Premium Dark Theme Center Card
function Login() {
  const [error, setError] = useState('');
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockName, setMockName] = useState('');
  const [mockRole, setMockRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [showMock, setShowMock] = useState(false);

  // Initialize Native Google One Tap / Sign In if available
  useEffect(() => {
    if (gsiLoaded && !accessRestricted) {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';

      console.log("Origin:", window.location.origin);
      console.log("Client ID:", clientId);
      
      if (!hubGsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        hubGsiInitialized = true;
      }

      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google.accounts.id.renderButton(
          btnEl,
          { 
            theme: 'filled_black', 
            size: 'large', 
            width: '320', 
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left'
          }
        );
      }
      window.google.accounts.id.prompt(); // Trigger Google One Tap
    }
  }, [gsiLoaded, accessRestricted]);

  useEffect(() => {
    if (window.google) {
      setGsiLoaded(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.google) {
        setGsiLoaded(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/google/', { credential: response.credential });
      if (res.data.user.role === 'STUDENT') {
        window.location.href = LEARN_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.response?.data?.error === 'ACCESS_RESTRICTED') {
        setAccessRestricted(true);
      } else {
        setError(err.response?.data?.message || 'Authentication failed. Please verify whitelist invitation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInFallback = () => {
    // Falls back to mock authentication if real credentials aren't initialized yet
    if (!window.google) {
      const email = prompt('Enter Google Whitelisted Email to simulate Google Sign-in:');
      if (email) {
        setMockEmail(email);
        setMockRole('ADMIN');
        // trigger login simulation
        const mockCredential = `mock:${email}:Test User:https://api.dicebear.com/7.x/adventurer/svg?seed=Test`;
        setLoading(true);
        api.post('/api/auth/google/', { credential: mockCredential })
          .then((res) => {
            if (res.data.user.role === 'STUDENT') {
              window.location.href = LEARN_URL;
            } else {
              window.location.href = '/dashboard';
            }
          })
          .catch((err) => {
            if (err.response?.data?.error === 'ACCESS_RESTRICTED') {
              setAccessRestricted(true);
            } else {
              setError(err.response?.data?.message || 'Authentication failed. Whitelist invitation required.');
            }
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
      if (res.data.user.role === 'STUDENT') {
        window.location.href = LEARN_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.response?.data?.error === 'ACCESS_RESTRICTED') {
        setAccessRestricted(true);
      } else {
        setError(err.response?.data?.message || 'Authentication failed. Whitelist invitation required.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (accessRestricted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070708] px-4 font-sans text-zinc-100">
        <div className="w-full max-w-[400px] bg-[#121214] border border-[#1e1e24] rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-800/30 flex items-center justify-center text-red-500 mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h2>
          
          <div className="text-zinc-400 mt-4 text-sm leading-relaxed space-y-4">
            <p>Your email is not authorized to access EduPlus.</p>
            <p>Please contact your administrator for access.</p>
          </div>
          
          <button
            onClick={() => {
              setAccessRestricted(false);
              setError('');
            }}
            className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-semibold transition-colors mt-8"
          >
            Try Another Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070708] px-4 font-sans text-zinc-100">
      <div className="w-full max-w-[400px] bg-[#121214] border border-[#1e1e24] rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/brand/logo.svg" alt="Eduport Plus" className="h-10 w-auto mb-4 object-contain" />
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
          <div className="w-full bg-red-950/50 text-red-400 text-xs p-3 rounded-lg mb-6 border border-red-900/50 whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="w-full space-y-6 flex flex-col items-center">
          <div 
            id="google-signin-btn" 
            className="w-full flex justify-center"
            style={{ display: gsiLoaded ? 'flex' : 'none' }}
          ></div>
          {!gsiLoaded && (
            /* Custom Styled Google OAuth Button (Pill Style) Fallback */
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
                  Developer Mock Access
                </span>
              </div>

              <form onSubmit={handleMockLogin} className="w-full space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Email</label>
                  <input
                    type="email"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    placeholder="mentor@eduport.com"
                    className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={mockName}
                      onChange={(e) => setMockName(e.target.value)}
                      placeholder="Jane Mentor"
                      className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Testing Role</label>
                    <select
                      value={mockRole}
                      onChange={(e) => setMockRole(e.target.value)}
                      className="w-full px-3 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MENTOR">Mentor</option>
                      <option value="TUTOR">Tutor</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
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
                      Continue with Mock Profile
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

// Dashboard Page (Premium Dark Card Stats & Listings Layout)
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/dashboard/stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Stats loading failed', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#050505]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Enrollments', value: stats?.students ?? 0 },
    { title: 'Active Households', value: stats?.students ?? 0 }, // Student list as Active Households
    { title: 'Pending Invites', value: stats?.pending_invitations ?? 0 },
  ];

  // Helper to generate dynamic days for last 7 days chart
  const generateChartData = () => {
    const data = [];
    const now = new Date();
    const mockValues = [1, 2, 0, 4, 5, 1, 2];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data.push({
        day: dayName,
        signups: mockValues[6 - i]
      });
    }
    return data;
  };

  const chartData = generateChartData();

  const recentSignups = [
    { student_code: 'EDP00041', full_name: 'Dona', created_at: '2026-06-17T12:00:00Z' },
    { student_code: 'EDP00009', full_name: 'Ahmad Zayan', created_at: '2026-06-16T12:00:00Z' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full box-border">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div 
            key={idx} 
            className="bg-white dark:bg-[#111111] p-6 h-[106px] rounded-xl border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] flex flex-col justify-between box-border transition-colors duration-200"
          >
            <p className="text-sm font-normal text-zinc-500 dark:text-[#a1a1aa] m-0 leading-normal">{card.title}</p>
            <h3 className="text-3xl font-semibold text-zinc-950 dark:text-white m-0 leading-none tabular-nums">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Stats sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Bar Chart Card */}
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-6 rounded-xl flex flex-col box-border transition-colors duration-200">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white m-0 leading-none">New Enrollments</h3>
          <p className="text-sm text-zinc-500 dark:text-[#a1a1aa] mt-1.5 mb-6">Student sign-ups over the last 7 days</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--chart-grid)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-xs text-zinc-900 dark:text-white shadow-md">
                          <p>{`Sign-ups: ${payload[0].value}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="signups"
                  fill="var(--chart-bar)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent signup listings */}
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-6 rounded-xl flex flex-col box-border transition-colors duration-200">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white m-0 leading-none">Recent Sign-ups</h3>
          <p className="text-sm text-zinc-500 dark:text-[#a1a1aa] mt-1.5 mb-6">The last 5 students who enrolled</p>
          
          <div className="flex-grow overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)]">
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-left align-middle">Student ID</th>
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-left align-middle">Name</th>
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-right align-middle">Joined At</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((s) => (
                  <tr key={s.student_code} className="hover:bg-zinc-50/50 dark:hover:bg-[rgba(255,255,255,0.03)] border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)] h-[44px] transition-colors">
                    <td className="py-2 px-4 text-zinc-500 dark:text-[#71717A] font-mono text-xs align-middle">{s.student_code}</td>
                    <td className="py-2 px-4 font-medium text-zinc-900 dark:text-white text-sm align-middle">{s.full_name}</td>
                    <td className="py-2 px-4 text-right text-zinc-500 dark:text-[#a1a1aa] text-sm font-normal align-middle">
                      {new Date(s.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
                <SidebarLayout user={user} logout={logout}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/admins" element={user?.role === 'ADMIN' ? <AdminsPage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/mentors" element={['ADMIN', 'MENTOR'].includes(user?.role) ? <MentorsPage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/tutors" element={['ADMIN', 'MENTOR'].includes(user?.role) ? <TutorsPage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/invitations" element={['ADMIN', 'MENTOR'].includes(user?.role) ? <InvitationsPage /> : <Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </SidebarLayout>
              )}
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
