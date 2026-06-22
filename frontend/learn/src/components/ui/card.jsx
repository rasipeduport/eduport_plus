import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5'
};

const variantClasses = {
  default: 'bg-surface-elevated border border-border-light shadow-card',
  elevated: 'bg-surface-elevated border border-border-light shadow-md',
  outlined: 'bg-surface-elevated border border-border'
};

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'lg',
  interactive = false,
  ...props
}) {
  return (
    <motion.div
      className={cn(
        'rounded-2xl transition-shadow duration-150',
        variantClasses[variant],
        paddingClasses[padding],
        interactive && 'hover:shadow-card-hover active:shadow-card cursor-pointer',
        className
      )}
      {...(interactive ? { whileTap: { scale: 0.98 } } : {})}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn(
        'text-lg leading-none font-semibold tracking-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('p-5 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div className={cn('flex items-center p-5 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
