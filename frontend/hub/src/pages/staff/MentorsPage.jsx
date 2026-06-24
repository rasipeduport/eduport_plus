import StaffManagementPage from './StaffManagementPage';

const config = {
  entityLabel: 'Mentor',
  endpoint: '/api/mentors/?all=true',
  responseKey: 'mentors',
  initialRole: 'MENTOR',
  fallbackInitial: 'M',
  hasStudentsCount: true,
};

export default function MentorsPage() {
  return <StaffManagementPage config={config} />;
}
