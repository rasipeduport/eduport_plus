import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import { LibraryTabs } from '../components/library/library-tabs';

export default function LibraryPage() {
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
