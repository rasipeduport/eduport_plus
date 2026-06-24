import { LogOut } from 'lucide-react';
import { useStudent } from '../components/student/student-context';
import { ProfileHeader } from '../components/profile/profile-header';
import { StudentInfoCard } from '../components/profile/student-info-card';
import { MentorCard } from '../components/profile/mentor-card';

export default function ProfilePage() {
  const { selectedStudent, user, dashboardStats, logout } = useStudent();

  if (!selectedStudent) return null;

  const info = {
    mobile: selectedStudent.mobile_number || '—',
    email: user?.email || '—',
    school: selectedStudent.school_name || '—',
    region: [selectedStudent.state, selectedStudent.country].filter(Boolean).join(', ') || '—'
  };

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Profile Header with Initials Avatar */}
      <ProfileHeader
        name={selectedStudent.full_name}
        grade={selectedStudent.grade || ''}
        avatarUrl={null}
      />

      {/* Student Information Details Card */}
      <StudentInfoCard info={info} />

      {/* Assigned Mentor Card */}
      <MentorCard
        mentorName={dashboardStats?.mentor}
        mentorEmail={dashboardStats?.mentor_email}
        mentorPhone={dashboardStats?.mentor_phone}
      />

      {/* Log out actions */}
      <div className="space-y-3 pb-4">
        <button
          onClick={logout}
          className="border-border bg-surface-elevated text-text-secondary hover:bg-surface-muted hover:text-text-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors duration-150 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
