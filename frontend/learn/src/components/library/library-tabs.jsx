import { useState, useMemo } from 'react';
import { Play, FileText, BookOpen, ChevronRight, Folder } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

const TAB_CONFIG = {
  recording: {
    label: 'Recordings',
    icon: Play,
    color: 'text-primary',
    bg: 'bg-primary-subtle',
    field: 'recording_link',
    emptyText: 'No recordings yet'
  },
  notes: {
    label: 'Notes',
    icon: FileText,
    color: 'text-info',
    bg: 'bg-info-subtle',
    field: 'notes_link',
    emptyText: 'No notes yet'
  },
  homework: {
    label: 'Homework',
    icon: BookOpen,
    color: 'text-warning',
    bg: 'bg-warning-subtle',
    field: 'homework_link',
    emptyText: 'No homework yet'
  }
};

const TABS = ['recording', 'notes', 'homework'];

function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(iso));
}

export function LibraryTabs({ sessions }) {
  const [active, setActive] = useState('recording');
  const cfg = TAB_CONFIG[active];
  const Icon = cfg.icon;

  const items = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => s[cfg.field]);
  }, [sessions, cfg.field]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tabs */}
      <div className="border-border-light bg-surface-muted inline-flex rounded-xl border p-1">
        {TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150 cursor-pointer',
                isActive
                  ? 'bg-surface-elevated text-text-primary shadow-card'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {TAB_CONFIG[tab].label}
            </button>
          );
        })}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-surface-muted mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
            <Folder className="text-text-muted h-5 w-5" />
          </div>
          <p className="text-text-primary text-sm font-semibold">
            {cfg.emptyText}
          </p>
          <p className="text-text-muted mt-1 text-xs">
            Materials will appear here once your classes are completed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <a
              key={s.id}
              href={s[cfg.field]}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card interactive padding="md">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      cfg.bg
                    )}
                  >
                    <Icon className={cn('h-5 w-5', cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary truncate text-sm font-semibold">
                      {s.title}
                    </p>
                    <p className="text-text-muted mt-0.5 truncate text-xs">
                      {formatDate(s.start_time)}
                      {s.tutor_profile?.full_name && ` · ${s.tutor_profile.full_name}`}
                    </p>
                  </div>
                  <ChevronRight className="text-text-muted h-5 w-5 shrink-0" />
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
