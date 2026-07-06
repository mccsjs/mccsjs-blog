import { type LabelHTMLAttributes } from 'react';

export function Label({ className = '', children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-sm font-medium text-[var(--text-h)] ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
