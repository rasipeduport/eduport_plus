import { useMemo } from 'react';
import { StudentContext } from '../components/student/student-context';

// Provides shared student state (profile, dashboard stats, auth actions) to the
// student-facing pages via StudentContext / useStudent().
export default function StudentProvider({ children, user, studentProfile, stats, reloadStats, logout }) {
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
