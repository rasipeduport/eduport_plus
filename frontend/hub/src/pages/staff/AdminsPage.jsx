import StaffManagementPage from './StaffManagementPage';

const config = {
  entityLabel: 'Admin',
  endpoint: '/api/admins/',
  responseKey: 'admins',
  initialRole: 'ADMIN',
  fallbackInitial: 'A',
  hasStudentsCount: false,
};

export default function AdminsPage() {
  return <StaffManagementPage config={config} />;
}
