import { forwardRef, type TextareaHTMLAttributes } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] placeholder:text-slate-400 outline-none transition-all hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-bg)] resize-y ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
