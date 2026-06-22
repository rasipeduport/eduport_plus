import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Loader2, ShieldAlert, RefreshCw, ArrowRight } from 'lucide-react';
import api from './lib/api';

// UI and layout imports
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { AppShell } from './components/student/app-shell';
import { StudentContext, useStudent } from './components/student/student-context';

// Page-specific section imports
import { WelcomeSection } from './components/home/welcome-section';
import { ClassesSection } from './components/home/classes-section';
import { LiveClassCard } from './components/home/live-class-card';
import { LastClassCard } from './components/home/last-class-card';
import { SessionsList } from './components/sessions/sessions-list';
import { LibraryTabs } from './components/library/library-tabs';
import { ProfileHeader } from './components/profile/profile-header';
import { StudentInfoCard } from './components/profile/student-info-card';
import { MentorCard } from './components/profile/mentor-card';

// Configurable Hub URL for redirecting staff roles
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3000';

// Global flag to track Google Sign-In initialization
let learnGsiInitialized = false;

// Student State Provider Component
function StudentProvider({ children, user, studentProfile, stats, reloadStats, logout }) {
  const value = useMemo(() => ({
    user,
    selectedStudent: studentProfile,
    profileEmail: user?.email,
    dashboardStats: stats,
    reloadStats,
    logout
  }), [user, studentProfile, stats, reloadStats, logout]);

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
}

// Authentication Guard / Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserAndStats = async () => {
    try {
      // 1. Fetch current user from session /me/
      const meResponse = await api.get('/api/auth/me/');
      const userData = meResponse.data.user;
      setUser(userData);
      
      // If staff logs into Learn, redirect them to the Hub portal
      if (userData.role !== 'STUDENT') {
        window.location.href = HUB_URL;
        return;
      }

      const profileData = meResponse.data.student_profile;
      setStudentProfile(profileData);

      // 2. Fetch student dashboard stats
      try {
        const statsResponse = await api.get('/api/student/dashboard/');
        setStats(statsResponse.data);

        // Redirect if in waiting room or login but verified
        if (location.pathname === '/waiting-room' || location.pathname === '/login') {
          navigate('/dashboard');
        }
      } catch (err) {
        if (err.response?.data?.error === 'STUDENT_PROFILE_NOT_FOUND') {
          if (location.pathname !== '/waiting-room') {
            navigate('/waiting-room');
          }
        } else {
          console.error('Failed to load dashboard stats', err);
        }
      }
    } catch (error) {
      setUser(null);
      setStudentProfile(null);
      setStats(null);
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadStats = async () => {
    try {
      const statsResponse = await api.get('/api/student/dashboard/');
      setStats(statsResponse.data);
    } catch (err) {
      console.error('Failed to reload dashboard stats', err);
    }
  };

  useEffect(() => {
    fetchUserAndStats();
  }, [location.pathname]);

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/');
      setUser(null);
      setStudentProfile(null);
      setStats(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Loading Eduport Plus...</p>
        </div>
      </div>
    );
  }

  return children({ user, studentProfile, stats, reloadStats, logout });
}

// ─── LOGIN COMPONENT ───
function Login() {
  const [error, setError] = useState('');
  const [accessRestricted, setAccessRestricted] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockName, setMockName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [showMock, setShowMock] = useState(false);

  // Initialize Native Google One Tap / Sign In if available
  useEffect(() => {
    if (gsiLoaded && !accessRestricted) {
      const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';
      
      if (!learnGsiInitialized) {
        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        learnGsiInitialized = true;
      }

      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google?.accounts.id.renderButton(
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
      window.google?.accounts.id.prompt(); // Trigger Google One Tap
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
      if (res.data.user.role !== 'STUDENT') {
        window.location.href = HUB_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.response?.data?.error === 'ACCESS_RESTRICTED') {
        setAccessRestricted(true);
      } else {
        setError(err.response?.data?.message || 'Authentication failed. Please verify student invitation.');
      }
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
      if (res.data.user.role !== 'STUDENT') {
        window.location.href = HUB_URL;
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
      <div className="min-h-screen flex items-center justify-center bg-surface px-4 font-sans text-text-primary">
        <div className="w-full max-w-[400px] bg-surface-elevated border border-border-light rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-danger-subtle border border-danger/15 flex items-center justify-center text-danger mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
          <div className="text-text-secondary mt-4 text-sm leading-relaxed space-y-4">
            <p>Your email is not authorized to access EduPlus.</p>
            <p>Please contact your administrator for access.</p>
          </div>
          <button
            onClick={() => {
              setAccessRestricted(false);
              setError('');
            }}
            className="w-full h-11 bg-primary text-white hover:bg-primary-hover rounded-lg text-sm font-semibold transition-colors mt-8 cursor-pointer"
          >
            Try Another Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-surface flex min-h-dvh flex-col">
      {/* Brand top accent */}
      <div className="from-primary to-accent h-1.5 bg-gradient-to-r" />

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Branding */}
          <div className="mb-8 text-center">
            <img
              src="/brand/logo.svg"
              alt="Eduport Plus"
              className="mx-auto mb-6 h-12 w-auto cursor-pointer"
              onDoubleClick={() => setShowMock(prev => !prev)}
              title="Double-click to toggle Developer Mock Access"
            />
            <h1 className="text-text-primary text-2xl font-bold md:text-3xl">
              Welcome Back
            </h1>
            <p className="text-text-secondary mt-2 text-sm">
              Continue your learning journey with Eduport Plus.
            </p>
          </div>

          {error && (
            <div className="w-full bg-danger-subtle text-danger text-xs p-3 rounded-lg mb-6 border border-danger/15 whitespace-pre-line">
              {error}
            </div>
          )}

          <Card variant="elevated" padding="lg">
            <p className="text-text-primary text-base font-semibold">
              Student Sign In
            </p>
            <p className="text-text-secondary mt-1 mb-6 text-sm">
              Access your classes, profile, and progress in one place.
            </p>
            
            <div className="w-full space-y-6 flex flex-col items-center">
              <div 
                id="google-signin-btn" 
                className="w-full flex justify-center"
                style={{ display: gsiLoaded ? 'flex' : 'none' }}
              ></div>
              {!gsiLoaded && (
                <button
                  onClick={handleGoogleSignInFallback}
                  className="w-full flex items-center justify-center gap-3 bg-white text-zinc-950 font-semibold h-11 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors duration-150 text-sm shadow-sm cursor-pointer"
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
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <span className="relative px-3 bg-surface-elevated text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Student Mock Login
                    </span>
                  </div>

                  <form onSubmit={handleMockLogin} className="w-full space-y-4">
                    <div className="text-left">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Whitelisted Email</label>
                      <input
                        type="email"
                        value={mockEmail}
                        onChange={(e) => setMockEmail(e.target.value)}
                        placeholder="student.dona@gmail.com"
                        className="w-full px-4 h-11 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        required
                      />
                    </div>
                    <div className="text-left">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Name</label>
                      <input
                        type="text"
                        value={mockName}
                        onChange={(e) => setMockName(e.target.value)}
                        placeholder="Dona Student"
                        className="w-full px-4 h-11 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
          </Card>
        </div>
      </div>
    </main>
  );
}

// ─── WAITING ROOM COMPONENT ───
function WaitingRoom() {
  const { logout } = useStudent();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.get('/api/auth/me/');
      // check if linked successfully
      await api.get('/api/student/dashboard/');
      navigate('/dashboard');
    } catch (err) {
      console.log('Linking pending...');
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <div className="bg-surface flex min-h-dvh flex-col text-text-primary">
      {/* Header */}
      <div className="from-primary to-primary-hover relative overflow-hidden bg-gradient-to-br px-6 pt-7 pb-6 md:px-7 md:pt-9 md:pb-8">
        <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
            <img
              src="/brand/icon.png"
              alt="Eduport Plus"
              className="w-7.5 h-7.5 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Account Verification
          </h1>
          <p className="mt-1.5 text-sm text-white/75 md:text-base">
            Processing your profile setup
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-6 md:py-8 flex flex-col justify-between">
        <div className="flex-1 space-y-4">
          <div className="rounded-2xl border border-border-light bg-surface-elevated p-5 shadow-card">
            <p className="text-text-primary text-sm leading-relaxed mb-4">
              We're just getting your account ready! Your profile is currently waiting to be linked with your student records.
            </p>
            <div className="rounded-xl bg-surface-muted p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Need help?</h3>
              <p className="text-text-secondary text-[13px] leading-relaxed">
                Please contact your <span className="font-medium text-text-primary">mentor</span> to fast-track this process. If you aren't sure who your mentor is, feel free to reach out to our{' '}
                <a 
                  href="https://wa.me/971585982494?text=Hi%21%20I%27m%20waiting%20to%20be%20verified%20on%20Eduport%20Plus." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  support team
                </a>.
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 h-11 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-70 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        <div className="mt-8">
          <button
            onClick={logout}
            className="border-border bg-surface-elevated text-text-secondary hover:bg-surface-muted hover:text-text-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD / HOME PAGE VIEW ───
function DashboardView() {
  const { selectedStudent, dashboardStats } = useStudent();

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Welcome Header */}
      <WelcomeSection studentName={selectedStudent?.full_name} />

      {/* Class Credits */}
      <ClassesSection
        totalClassQuota={selectedStudent?.total_class_quota || 0}
        scheduledCount={dashboardStats.scheduled_count}
        attendedCount={dashboardStats.attended_count}
        loading={false}
      />

      {/* Live Class */}
      <section>
        <h2 className="text-text-primary text-base font-semibold">
          Your Next Live Class
        </h2>
        <p className="text-text-secondary mt-1 mb-3 text-sm">
          Join your scheduled one-on-one learning session.
        </p>
        <LiveClassCard
          meetLink={selectedStudent?.meet_link}
          nextSession={dashboardStats.next_session}
          loading={false}
        />
      </section>

      {/* Last Class Recap */}
      {dashboardStats.last_session && (
        <section>
          <h2 className="text-text-primary text-base font-semibold">
            Last Class Recap
          </h2>
          <p className="text-text-secondary mt-1 mb-3 text-sm">
            Review resources and rate your previous session.
          </p>
          <LastClassCard session={dashboardStats.last_session} />
        </section>
      )}
    </div>
  );
}

// ─── SESSIONS PAGE VIEW ───
function SessionsPageView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/sessions/');
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <section>
        <h1 className="text-text-primary text-xl font-bold md:text-2xl">
          Sessions
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          Your 1-to-1 class sessions.
        </p>
      </section>

      <SessionsList sessions={sessions} />
    </div>
  );
}

// ─── LIBRARY PAGE VIEW ───
function LibraryPageView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendedSessions = async () => {
    try {
      const res = await api.get('/api/sessions/');
      // filter only completed/attended classes in frontend
      const completed = (res.data.sessions || []).filter(s => s.status === 'attended');
      setSessions(completed);
    } catch (err) {
      console.error('Failed to load library resources', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendedSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <section>
        <h1 className="text-text-primary text-xl font-bold md:text-2xl">
          Library
        </h1>
        <p className="text-text-secondary mt-1 text-sm">
          All your class materials in one place.
        </p>
      </section>

      <LibraryTabs sessions={sessions} />
    </div>
  );
}

// ─── PROFILE PAGE VIEW ───
function ProfilePageView() {
  const { selectedStudent, user, dashboardStats, logout } = useStudent();

  if (!selectedStudent) return null;

  const info = {
    mobile: selectedStudent.mobile_number || '\u2014',
    email: user?.email || '\u2014',
    school: selectedStudent.school_name || '\u2014',
    region: [selectedStudent.state, selectedStudent.country].filter(Boolean).join(', ') || '\u2014'
  };

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Profile Header with Initials Avatar */}
      <ProfileHeader
        name={selectedStudent.full_name}
        grade={selectedStudent.grade || ''}
        avatarUrl={null}
      />

      {/* Student Information Details Card */}
      <StudentInfoCard info={info} />

      {/* Assigned Mentor Card */}
      <MentorCard 
        mentorName={dashboardStats?.mentor} 
        mentorEmail={dashboardStats?.mentor_email} 
        mentorPhone={dashboardStats?.mentor_phone} 
      />

      {/* Log out actions */}
      <div className="space-y-3 pb-4">
        <button
          onClick={logout}
          className="border-border bg-surface-elevated text-text-secondary hover:bg-surface-muted hover:text-text-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── APP ROUTER ROUTING ENTRY ───
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthProvider>
              {({ user, studentProfile, stats, reloadStats, logout }) => (
                <StudentProvider
                  user={user}
                  studentProfile={studentProfile}
                  stats={stats}
                  reloadStats={reloadStats}
                  logout={logout}
                >
                  <Routes>
                    <Route 
                      path="/dashboard" 
                      element={<AppShell><DashboardView /></AppShell>} 
                    />
                    <Route 
                      path="/sessions" 
                      element={<AppShell><SessionsPageView /></AppShell>} 
                    />
                    <Route 
                      path="/library" 
                      element={<AppShell><LibraryPageView /></AppShell>} 
                    />
                    <Route 
                      path="/profile" 
                      element={<AppShell><ProfilePageView /></AppShell>} 
                    />
                    <Route 
                      path="/waiting-room" 
                      element={<WaitingRoom />} 
                    />
                    <Route 
                      path="*" 
                      element={<Navigate to="/dashboard" replace />} 
                    />
                  </Routes>
                </StudentProvider>
              )}
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
