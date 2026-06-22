import { cn } from '../../lib/utils';

const cards = [
  {
    key: 'purchased',
    label: 'Purchased',
    bgClass: 'bg-info-subtle',
    borderClass: 'border-info/15',
    numberClass: 'text-info',
    labelClass: 'text-info/65'
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    bgClass: 'bg-primary-subtle',
    borderClass: 'border-primary/15',
    numberClass: 'text-primary-hover',
    labelClass: 'text-primary-hover/65'
  },
  {
    key: 'attended',
    label: 'Attended',
    bgClass: 'bg-warning-subtle',
    borderClass: 'border-warning/15',
    numberClass: 'text-warning',
    labelClass: 'text-warning/65'
  }
];

export function ClassesSection({
  totalClassQuota,
  scheduledCount,
  attendedCount,
  loading
}) {
  const values = [totalClassQuota, scheduledCount, attendedCount];

  return (
    <section>
      <h2 className="text-text-primary text-base font-semibold">
        Your Classes
      </h2>
      <p className="text-text-secondary mt-1 mb-3 text-sm">
        A snapshot of your class credits.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <div
            key={card.key}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-4',
              card.bgClass,
              card.borderClass
            )}
          >
            <span
              className={cn(
                'text-3xl font-bold tabular-nums',
                card.numberClass
              )}
            >
              {loading && i > 0 ? '–' : values[i]}
            </span>
            <span
              className={cn(
                'text-xs font-medium',
                card.labelClass
              )}
            >
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
