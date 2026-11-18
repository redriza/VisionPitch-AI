import type { ElementType, ReactNode } from "react";

export function Panel({
  title,
  icon: Icon,
  badge,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  icon?: ElementType;
  badge?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          {badge}
          {!badge && Icon && <Icon className="h-3.5 w-3.5 text-cyan-300" />}
          <h3 className="panel-title">{title}</h3>
          {right && <div className="ml-auto">{right}</div>}
        </header>
      )}
      <div className={`px-4 pb-4 ${title ? "" : "pt-4"} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent = "#22d3ee",
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="panel relative overflow-hidden p-4">
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-30"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="eyebrow">{label}</span>
      </div>
      <p className="num mt-3 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function StatRow({
  label,
  value,
  pct,
  color = "#22d3ee",
}: {
  label: string;
  value: ReactNode;
  pct?: number;
  color?: string;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="num font-medium text-slate-100">{value}</span>
      </div>
      {pct !== undefined && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(2, Math.min(100, pct))}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              boxShadow: `0 0 10px ${color}66`,
            }}
          />
        </div>
      )}
    </div>
  );
}
