import { Phone, Mail, Building, MapPin } from 'lucide-react';
import { Card } from '../ui/card';

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="bg-primary-subtle flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text-muted text-xs">{label}</p>
        <p className="text-text-primary truncate text-sm font-medium">
          {value}
        </p>
      </div>
    </div>
  );
}

export function StudentInfoCard({ info }) {
  const items = [
    {
      icon: <Phone className="text-primary h-5 w-5" />,
      label: 'Mobile',
      value: info.mobile
    },
    {
      icon: <Mail className="text-primary h-5 w-5" />,
      label: 'Email',
      value: info.email
    },
    {
      icon: <Building className="text-primary h-5 w-5" />,
      label: 'School',
      value: info.school
    },
    {
      icon: <MapPin className="text-primary h-5 w-5" />,
      label: 'Region',
      value: info.region
    }
  ];

  return (
    <Card>
      <h3 className="text-text-secondary mb-4 text-sm font-semibold">
        Student Information
      </h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <InfoRow
            key={i}
            icon={item.icon}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>
    </Card>
  );
}
