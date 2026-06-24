import { useState } from 'react';
import { LogOut, ChevronRight, GraduationCap, Loader2 } from 'lucide-react';
import { useStudent } from '../components/student/student-context';

// Shown when a parent account has more than one linked student and none is
// currently selected. Picking a child sets the ep-student-id cookie (server
// side) and routes into that child's dashboard.
export default function SelectProfilePage() {
  const { students, selectedStudent, switchStudent, logout } = useStudent();
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState('');

  const handleSelect = async (id) => {
    setPendingId(id);
    setError('');
    try {
      await switchStudent(id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not select that student. Please try again.');
      setPendingId(null);
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
            <img src="/brand/icon.png" alt="Eduport Plus" className="w-7.5 h-7.5 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Who's learning?</h1>
          <p className="mt-1.5 text-sm text-white/75 md:text-base">
            Choose a student to continue
          </p>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 py-6 md:py-8 flex flex-col justify-between">
        <div className="flex-1 space-y-3">
          {error && (
            <div className="w-full bg-danger-subtle text-danger text-xs p-3 rounded-lg border border-danger/15">
              {error}
            </div>
          )}

          {students.map((s) => {
            const isPending = pendingId === s.id;
            const isSelected = selectedStudent?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                disabled={pendingId !== null}
                className={`flex w-full items-center gap-3 rounded-2xl border bg-surface-elevated p-4 text-left shadow-card transition-colors hover:bg-surface-muted disabled:opacity-70 cursor-pointer ${
                  isSelected ? 'border-primary' : 'border-border-light'
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">{s.full_name}</p>
                  <p className="truncate text-[13px] text-text-secondary">
                    {[s.grade, s.student_code].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {isPending ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
                )}
              </button>
            );
          })}
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
