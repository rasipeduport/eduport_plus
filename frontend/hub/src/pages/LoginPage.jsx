import { useState, useEffect } from 'react';
import { Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import api from '../lib/api';

const LEARN_URL = import.meta.env.VITE_LEARN_URL || 'http://localhost:3001';

// Global flag to track Google Sign-In initialization
let hubGsiInitialized = false;

// Login Page - Premium Dark Theme Center Card
export default function LoginPage() {
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
