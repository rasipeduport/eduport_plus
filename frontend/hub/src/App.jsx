import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Compass, Presentation, Mail, Plus, Check, LogOut, Loader2, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import api from './lib/api';

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

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Students', path: '/students', icon: GraduationCap },
    { title: 'Sessions', path: '/sessions', icon: Presentation },
    { title: 'Admins', path: '/admins', icon: ShieldCheck },
    { title: 'Mentors', path: '/mentors', icon: Compass },
    { title: 'Tutors', path: '/tutors', icon: Presentation },
    { title: 'Invitations', path: '/invitations/create', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex bg-[#09090b] text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0c] border-r border-[#1e1e24] flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1e1e24]">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            E+
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white m-0">Eduport Plus</h1>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400">Hub</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#18181b] text-white border border-[#27272a]'
                    : 'text-zinc-400 hover:bg-[#121214] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-indigo-400" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-[#1e1e24] flex items-center justify-between gap-3 bg-[#0c0c0e]">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-9 h-9 rounded-full bg-zinc-800 object-cover border border-[#27272a]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-semibold text-white">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate m-0">{user?.full_name}</p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[#0a0a0c] border-b border-[#1e1e24] flex items-center px-8 justify-between">
          <h2 className="text-lg font-bold text-white m-0">
            {location.pathname === '/dashboard' ? 'Dashboard' : 'Invitations'}
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-[#09090b]">{children}</main>
      </div>
    </div>
  );
}

// Login Page - Premium Dark Theme Center Card
function Login() {
  const [error, setError] = useState('');
  const [mockEmail, setMockEmail] = useState('');
  const [mockName, setMockName] = useState('');
  const [mockRole, setMockRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [showMock, setShowMock] = useState(false);

  // Initialize Native Google One Tap / Sign In if available
  useEffect(() => {
    const initGsi = () => {
      if (window.google) {
        setGsiLoaded(true);
        const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com';

        console.log("Origin:", window.location.origin);
        console.log("Client ID:", clientId);
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
      if (res.data.user.role === 'STUDENT') {
        window.location.href = LEARN_URL;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify whitelist invitation.');
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
      if (res.data.user.role === 'STUDENT') {
        window.location.href = LEARN_URL;
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
      <div className="flex items-center justify-center h-64 bg-[#09090b]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Enrollments', value: stats?.students ?? 0, icon: GraduationCap, color: 'text-indigo-400 bg-indigo-950/20 border-indigo-900/50' },
    { title: 'Active Househoulds', value: stats?.students ?? 0, icon: Compass, color: 'text-sky-400 bg-sky-950/20 border-sky-900/50' }, // Student list as Active Households
    { title: 'Pending Invites', value: stats?.pending_invitations ?? 0, icon: Mail, color: 'text-amber-400 bg-amber-950/20 border-amber-900/50' },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-[#121214] p-6 rounded-xl shadow-sm border border-[#1e1e24] flex items-center gap-5">
              <div className={`p-4 rounded-xl border ${card.color} shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest m-0">{card.title}</p>
                <h3 className="text-3xl font-extrabold text-white mt-1.5 m-0">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Stats sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups over last 7 days chart mockup */}
        <div className="bg-[#121214] border border-[#1e1e24] p-6 rounded-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">New Enrollments</h3>
          <p className="text-xs text-zinc-500 mb-6">Student sign-ups over the last 7 days</p>
          <div className="h-48 flex items-end justify-around border-b border-[#1e1e24] pb-2 text-zinc-500 text-xs">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-zinc-800 rounded-t-sm h-4"></div>
              <span>Jun 13</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-zinc-800 rounded-t-sm h-6"></div>
              <span>Jun 14</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-zinc-800 rounded-t-sm h-2"></div>
              <span>Jun 15</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-indigo-600 rounded-t-sm h-16"></div>
              <span>Jun 16</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-indigo-600 rounded-t-sm h-20"></div>
              <span>Jun 17</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-zinc-800 rounded-t-sm h-3"></div>
              <span>Jun 18</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 bg-zinc-800 rounded-t-sm h-5"></div>
              <span>Jun 19</span>
            </div>
          </div>
        </div>

        {/* Recent signup listings */}
        <div className="bg-[#121214] border border-[#1e1e24] p-6 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Recent Sign-ups</h3>
          <p className="text-xs text-zinc-500 mb-6">The last 5 students who enrolled</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1e1e24] text-zinc-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Student ID</th>
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5 text-right">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]/50">
                <tr className="text-zinc-300">
                  <td className="py-3 text-zinc-500 font-mono font-medium">EDP00041</td>
                  <td className="py-3 font-semibold text-white">Dona</td>
                  <td className="py-3 text-right text-zinc-400">Jun 17, 2026</td>
                </tr>
                <tr className="text-zinc-300">
                  <td className="py-3 text-zinc-500 font-mono font-medium">EDP00009</td>
                  <td className="py-3 font-semibold text-white">Ahmad Zayan</td>
                  <td className="py-3 text-right text-zinc-400">Jun 16, 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Invitation Page (Role Dropdown: Admin, Mentor, Tutor, Student)
function CreateInvitation() {
  const [role, setRole] = useState('STUDENT');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [studentInfo, setStudentInfo] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [tutors, setTutors] = useState([]);

  // Form Fields
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedTutor, setSelectedTutor] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [whatsappCreated, setWhatsappCreated] = useState(false);

  // Fetch staff dropdown lists once
  const loadStaffLists = async () => {
    try {
      const [mentorsRes, tutorsRes] = await Promise.all([
        api.get('/api/mentors/'),
        api.get('/api/tutors/')
      ]);
      setMentors(mentorsRes.data.mentors || []);
      setTutors(tutorsRes.data.tutors || []);
    } catch (err) {
      console.error('Failed to load staff lists', err);
    }
  };

  useEffect(() => {
    if (role === 'STUDENT') {
      loadStaffLists();
    }
    // Clear forms on role shift
    setEmail('');
    setFullName('');
    setStudentCode('');
    setStudentInfo(null);
    setSelectedMentor('');
    setSelectedTutor('');
    setMeetLink('');
    setWhatsappCreated(false);
    setError('');
    setSuccess('');
  }, [role]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setError('Please provide a student code.');
      return;
    }
    setVerifying(true);
    setError('');
    setSuccess('');
    setStudentInfo(null);

    try {
      const lookupRes = await api.post('/api/invitations/lookup-student/', { student_code: studentCode.trim() });
      const data = lookupRes.data.student_data;
      setStudentInfo(data);
      setEmail(data.email);
      setFullName(data.full_name);

      // Pre-select tutor if tutor_name matches
      const sheetTutorName = (data.tutor_name || '').trim().toLowerCase();
      if (sheetTutorName) {
        const matchedTutor = tutors.find(
          (t) => (t.full_name || '').trim().toLowerCase() === sheetTutorName
        );
        if (matchedTutor) {
          setSelectedTutor(matchedTutor.id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Student code lookup failed. Verify Sheets data.');
    } finally {
      setVerifying(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a whitelisted email.');
      return;
    }
    if (role === 'STUDENT' && !studentInfo) {
      setError('Please search and verify student code first.');
      return;
    }
    if (role === 'STUDENT' && meetLink && !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(meetLink.trim())) {
      setError('Google Meet Link must be valid (e.g. https://meet.google.com/abc-defg-hij).');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        role,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || email.split('@')[0],
      };

      if (role === 'STUDENT') {
        payload.student_code = studentInfo.student_code;
        payload.mobile_number = studentInfo.mobile_number;
        payload.country = studentInfo.country;
        payload.state = studentInfo.state;
        payload.school_name = studentInfo.school_name;
        payload.grade = studentInfo.grade;
        payload.syllabus = studentInfo.syllabus;
        payload.admission_date = studentInfo.admission_date;
        payload.remarks = studentInfo.remarks;
        payload.mentor_id = selectedMentor || null;
        payload.tutor_id = selectedTutor || null;
        payload.meet_link = meetLink.trim() || null;
      }

      await api.post('/api/invitations/', payload);

      setSuccess(`Invitation created successfully for ${payload.full_name} (${role})!`);
      // Reset
      setEmail('');
      setFullName('');
      setStudentCode('');
      setStudentInfo(null);
      setSelectedMentor('');
      setSelectedTutor('');
      setMeetLink('');
      setWhatsappCreated(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create whitelist invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl bg-[#121214] border border-[#1e1e24] rounded-xl shadow-sm p-8 mx-auto">
      <div className="mb-6">
        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Role Type</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-[#1a1a1e] transition-all"
        >
          <option value="STUDENT">Student (lookup sheet)</option>
          <option value="MENTOR">Mentor (direct invite)</option>
          <option value="TUTOR">Tutor (direct invite)</option>
          <option value="ADMIN">Admin (direct invite)</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-950/40 text-red-400 text-xs p-3 rounded-lg mb-6 border border-red-900/50">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-950/40 text-emerald-400 text-xs p-3 rounded-lg mb-6 border border-emerald-900/50 flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          {success}
        </div>
      )}

      {/* Code Verification Step (Only for Students) */}
      {role === 'STUDENT' && (
        <form onSubmit={handleLookup} className="flex gap-4 items-end mb-8">
          <div className="flex-1">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Student Code</label>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder="EDP00009"
              className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
              disabled={verifying || submitting}
              required
            />
          </div>
          <button
            type="submit"
            disabled={verifying || submitting || !studentCode.trim()}
            className="h-11 px-6 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>
      )}

      {/* Direct Invitation Form (For Admin, Mentor, Tutor) or Verified Student form */}
      {(role !== 'STUDENT' || studentInfo) && (
        <form onSubmit={handleInvite} className="space-y-6 pt-6 border-t border-[#1e1e24]/70">
          {studentInfo && (
            <div className="bg-indigo-950/20 rounded-xl p-5 border border-indigo-900/40 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Full Name</span>
                <p className="text-white font-semibold mt-0.5 m-0">{studentInfo.full_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Email Address</span>
                <p className="text-white font-semibold mt-0.5 m-0">{studentInfo.email}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Grade & Syllabus</span>
                <p className="text-zinc-300 font-medium mt-0.5 m-0">{studentInfo.grade} - {studentInfo.syllabus}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Tutor Name (Sheet)</span>
                <p className="text-zinc-300 font-medium mt-0.5 m-0">{studentInfo.tutor_name || '—'}</p>
              </div>
            </div>
          )}

          {role !== 'STUDENT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Staff Full Name"
                  className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {role === 'STUDENT' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Assign Mentor</label>
                  <select
                    value={selectedMentor}
                    onChange={(e) => setSelectedMentor(e.target.value)}
                    className="w-full px-3 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  >
                    <option value="">Select Mentor...</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Assign Tutor</label>
                  <select
                    value={selectedTutor}
                    onChange={(e) => setSelectedTutor(e.target.value)}
                    className="w-full px-3 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  >
                    <option value="">Select Tutor...</option>
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Google Meet Link</label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-4 h-11 bg-[#1a1a1e] border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  required
                />
                <p className="text-zinc-500 flex items-start gap-1.5 text-xs mt-2 leading-relaxed">
                  <Info className="w-3.5 h-3.5 mt-0.5 text-indigo-400 shrink-0" />
                  <span>
                    Make sure the classroom setting is set to <strong>Open</strong> so the student can join.
                  </span>
                </p>
              </div>

              <label className="flex items-start gap-3 select-none">
                <input
                  type="checkbox"
                  checked={whatsappCreated}
                  onChange={(e) => setWhatsappCreated(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-[#1a1a1e] text-indigo-600 focus:ring-indigo-500"
                  required
                />
                <span className="text-sm text-zinc-400 leading-normal">
                  Have you created the WhatsApp group for this student? (Required to submit)
                </span>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || (role === 'STUDENT' && !whatsappCreated)}
            className="w-full h-11 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Inviting...
              </>
            ) : (
              'Create Whitelist Invitation'
            )}
          </button>
        </form>
      )}
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
                    <Route path="/invitations/create" element={<CreateInvitation />} />
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
