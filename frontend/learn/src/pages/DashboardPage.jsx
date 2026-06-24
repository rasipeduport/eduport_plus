import { Loader2 } from 'lucide-react';
import { useStudent } from '../components/student/student-context';
import { WelcomeSection } from '../components/home/welcome-section';
import { ClassesSection } from '../components/home/classes-section';
import { LiveClassCard } from '../components/home/live-class-card';
import { LastClassCard } from '../components/home/last-class-card';

export default function DashboardPage() {
  const { selectedStudent, dashboardStats } = useStudent();

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Welcome Header */}
      <WelcomeSection studentName={selectedStudent?.full_name} />

      {/* Class Credits */}
      <ClassesSection
        totalClassQuota={selectedStudent?.total_class_quota || 0}
        scheduledCount={dashboardStats.scheduled_count}
        attendedCount={dashboardStats.attended_count}
        loading={false}
      />

      {/* Live Class */}
      <section>
        <h2 className="text-text-primary text-base font-semibold">
          Your Next Live Class
        </h2>
        <p className="text-text-secondary mt-1 mb-3 text-sm">
          Join your scheduled one-on-one learning session.
        </p>
        <LiveClassCard
          meetLink={selectedStudent?.meet_link}
          nextSession={dashboardStats.next_session}
          loading={false}
        />
      </section>

      {/* Last Class Recap */}
      {dashboardStats.last_session && (
        <section>
          <h2 className="text-text-primary text-base font-semibold">
            Last Class Recap
          </h2>
          <p className="text-text-secondary mt-1 mb-3 text-sm">
            Review resources and rate your previous session.
          </p>
          <LastClassCard session={dashboardStats.last_session} />
        </section>
      )}
    </div>
  );
}
