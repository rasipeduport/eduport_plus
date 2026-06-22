import { useState, useMemo } from 'react';
import { SessionCard } from './session-card';
import { cn } from '../../lib/utils';

const tabs = ['Scheduled', 'Attended'];

export function SessionsList({ sessions }) {
  const [activeTab, setActiveTab] = useState('Scheduled');
  const [expandedSessionId, setExpandedSessionId] = useState(null);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (activeTab === 'Attended') {
      return sessions.filter((s) => s.status === 'attended');
    }
    return sessions.filter((s) => s.status === 'scheduled');
  }, [sessions, activeTab]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tabs */}
      <div className="border-border-light bg-surface-muted inline-flex rounded-xl border p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150 cursor-pointer',
              activeTab === tab
                ? 'bg-surface-elevated text-text-primary shadow-card'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-primary text-sm font-semibold">
            {activeTab === 'Attended'
              ? 'No attended sessions yet'
              : 'No scheduled sessions'}
          </p>
          <p className="text-text-muted mt-1 text-xs">
            {activeTab === 'Attended'
              ? 'Sessions you complete will appear here.'
              : 'Your upcoming sessions will show up here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isExpanded={expandedSessionId === session.id}
              onToggle={() =>
                setExpandedSessionId(
                  expandedSessionId === session.id ? null : session.id
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
