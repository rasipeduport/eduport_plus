import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const sizeClasses = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2'
};

const variantClasses = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-xs cursor-pointer',
  secondary: 'bg-surface-muted text-text-primary hover:bg-surface-inset border border-border cursor-pointer',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary cursor-pointer',
  outline: 'bg-surface-elevated text-text-primary border border-border hover:bg-surface-muted cursor-pointer',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 cursor-pointer'
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  ...props
}) {
  return (
    <motion.button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-150',
        'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </motion.button>
  );
}
