import { cn } from '../../lib/utils';

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl'
};

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  fallback,
  className
}) {
  const initials = fallback
    ? fallback
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'bg-accent-muted text-accent-foreground relative flex items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-white shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Handle loading error by hiding the image to let initials show
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
