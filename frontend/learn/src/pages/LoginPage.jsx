import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { Card } from '../components/ui/card';

// Configurable Hub URL for redirecting staff roles
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3000';

// Global flag to track Google Sign-In initialization
let learnGsiInitialized = false;

export default function LoginPage() {
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
