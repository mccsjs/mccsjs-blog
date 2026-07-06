import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export default function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const variants: Record<ButtonVariant, string> = {
    primary:
      'text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[var(--accent)] [background-image:var(--accent-grad)]',
    secondary:
      'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] focus-visible:ring-[var(--accent)]',
    danger:
      'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:-translate-y-0.5 focus-visible:ring-red-500',
    ghost:
      'bg-transparent text-[var(--text)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-h)] focus-visible:ring-[var(--accent)]',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
