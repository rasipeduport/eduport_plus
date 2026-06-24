import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';

// Configurable Hub URL for redirecting staff roles
const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3000';

/**
 * Authentication guard. Loads the current user + student profile + dashboard
 * stats, routes students to /waiting-room until their profile is linked, and
 * redirects staff roles to the Hub. Exposes its state via a render prop.
 */
export default function AuthProvider({ children }) {
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
