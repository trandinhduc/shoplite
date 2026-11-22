import type { ReactNode } from "react";

interface EmptyStateProps {
  emoji: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="text-5xl" aria-hidden>
        {emoji}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
