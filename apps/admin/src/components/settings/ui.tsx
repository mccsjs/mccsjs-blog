import type { ReactNode } from 'react';
import { Label } from '../ui/label';

export function Field({
  label,
  helper,
  children,
  className = '',
}: {
  label: string;
  helper?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={label}>{label}</Label>
      {children}
      {helper && <p className="text-xs text-[var(--text)]">{helper}</p>}
    </div>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`mt-2 border-t border-[var(--border)] pt-5 text-base font-semibold text-[var(--text-h)] ${className}`}>
      {children}
    </h2>
  );
}

export function OptionCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--bg-soft)]'
          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
      }`}
    >
      <div className="flex items-center gap-2">
        <input type="radio" checked={active} onChange={onClick} />
        <span className="text-sm font-medium text-[var(--text-h)]">{title}</span>
      </div>
      <span className="pl-6 text-xs text-[var(--text)]">{desc}</span>
    </label>
  );
}
