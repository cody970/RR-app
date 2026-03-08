interface DashboardHeaderProps {
  heading: string;
  text?: string;
  children?: React.ReactNode;
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {heading}
        </h1>
        {text && (
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {text}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
