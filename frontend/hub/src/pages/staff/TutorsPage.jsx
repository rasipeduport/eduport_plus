import StaffManagementPage from './StaffManagementPage';

const config = {
  entityLabel: 'Tutor',
  endpoint: '/api/tutors/?all=true',
  responseKey: 'tutors',
  initialRole: 'TUTOR',
  fallbackInitial: 'T',
  hasStudentsCount: true,
};

export default function TutorsPage() {
  return <StaffManagementPage config={config} />;
}
