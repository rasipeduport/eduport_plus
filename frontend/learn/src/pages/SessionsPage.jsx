import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import { SessionsList } from '../components/sessions/sessions-list';

export default function SessionsPage() {
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
