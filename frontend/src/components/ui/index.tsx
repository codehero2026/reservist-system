// src/components/ui/index.tsx — Colourful SaaS dashboard UI system
import * as React from "react";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

// ── Button ───────────────────────────────────────────────────────────
type BtnVariant = "primary"|"secondary"|"ghost"|"danger"|"outline";
type BtnSize    = "xs"|"sm"|"md"|"lg"|"icon-sm"|"icon";
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean;
}
const BV: Record<BtnVariant,string> = {
  primary:   "bg-blue-500 text-white hover:bg-blue-600 shadow-sm",
  secondary: "bg-[rgb(var(--page-bg))] text-ink border border-[rgb(var(--border))] hover:bg-[rgb(var(--border))]",
  outline:   "border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] text-ink2 hover:bg-[rgb(var(--page-bg))] hover:text-ink",
  ghost:     "text-ink2 hover:bg-[rgb(var(--page-bg))] hover:text-ink",
  danger:    "bg-red-500 text-white hover:bg-red-600 shadow-sm",
};
const BS: Record<BtnSize,string> = {
  xs:       "h-6 px-2 text-2xs rounded-lg gap-1",
  sm:       "h-7 px-3 text-xs rounded-lg gap-1.5",
  md:       "h-8 px-4 text-sm rounded-xl gap-2",
  lg:       "h-10 px-5 text-sm rounded-xl gap-2",
  "icon-sm":"h-7 w-7 p-0 rounded-lg",
  "icon":   "h-8 w-8 p-0 rounded-xl",
};
export function Button({ className, variant="primary", size="md", loading, children, disabled, ...p }: BtnProps) {
  return (
    <button
      className={cn("inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:pointer-events-none select-none", BV[variant], BS[size], className)}
      disabled={disabled||loading} {...p}
    >
      {loading && <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full shrink-0"/>}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────
type BadgeV = "default"|"blue"|"green"|"amber"|"red"|"purple"|"outline";
export function Badge({ children, variant="default", dot, className }: {
  children: React.ReactNode; variant?: BadgeV; dot?: boolean; className?: string;
}) {
  const v: Record<BadgeV,string> = {
    default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    blue:    "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
    green:   "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-300",
    amber:   "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
    red:     "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300",
    purple:  "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300",
    outline: "border border-[rgb(var(--border))] text-ink2",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold", v[variant], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────
export function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn("w-8 h-8 rounded-full object-cover shrink-0 select-none bg-white border border-white/10 dark:border-black/20", className)}
      />
    );
  }
  const initials = name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none", className)}>
      {initials || "?"}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const m: Record<string,{v:BadgeV;label:string}> = {
    READY:     {v:"green",  label:"Ready"},
    STANDBY:   {v:"amber",  label:"Standby"},
    RETIRED:   {v:"default",label:"Retired"},
    DISCHARGED:{v:"red",    label:"Discharged"},
  };
  const c = m[status] ?? {v:"default" as BadgeV, label:status};
  return <Badge variant={c.v} dot>{c.label}</Badge>;
}

// ── RoleBadge ─────────────────────────────────────────────────────────
export function RoleBadge({ role }: { role: string }) {
  const m: Record<string,{v:BadgeV;label:string}> = {
    ADMIN:     {v:"blue",   label:"Admin"},
    S1_OFFICER:{v:"blue",   label:"S1 Officer"},
    UNIT_CLERK:{v:"default",label:"Unit Clerk"},
    VIEWER:    {v:"outline",label:"Viewer"},
  };
  const c = m[role] ?? {v:"default" as BadgeV, label:role};
  return <Badge variant={c.v}>{c.label}</Badge>;
}

// ── DedupBadge ────────────────────────────────────────────────────────
export function DedupBadge({ status }: { status: string }) {
  const m: Record<string,{v:BadgeV;label:string}> = {
    PENDING: {v:"amber",label:"Pending"},
    RESOLVED:{v:"green",label:"Resolved"},
    MERGED:  {v:"blue", label:"Merged"},
    FLAGGED: {v:"red",  label:"Flagged"},
  };
  const c = m[status] ?? {v:"default" as BadgeV, label:status};
  return <Badge variant={c.v} dot>{c.label}</Badge>;
}

// ── Card ──────────────────────────────────────────────────────────────
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-card", className)} {...p}>
      {children}
    </div>
  );
}
export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-[rgb(var(--border))] flex items-center justify-between", className)}>{children}</div>;
}
export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-bold text-ink", className)}>{children}</h3>;
}
export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

// ── KPI Card — matching reference colourful style ─────────────────────
type KpiColor = "green"|"orange"|"yellow"|"blue"|"purple"|"red"|"teal"|"pink";
const KPI_COLORS: Record<KpiColor, { bg: string; text: string; border: string; icon: string }> = {
  green:  { bg:"bg-[rgb(var(--c-green)/0.12)]",  text:"text-[rgb(var(--c-green))]",  border:"border-l-[rgb(var(--c-green))]",  icon:"bg-[rgb(var(--c-green))]"  },
  orange: { bg:"bg-[rgb(var(--c-orange)/0.12)]", text:"text-[rgb(var(--c-orange))]", border:"border-l-[rgb(var(--c-orange))]", icon:"bg-[rgb(var(--c-orange))]" },
  yellow: { bg:"bg-[rgb(var(--c-yellow)/0.12)]", text:"text-[rgb(var(--c-yellow))]", border:"border-l-[rgb(var(--c-yellow))]", icon:"bg-[rgb(var(--c-yellow))]" },
  blue:   { bg:"bg-[rgb(var(--c-blue)/0.12)]",   text:"text-[rgb(var(--c-blue))]",   border:"border-l-[rgb(var(--c-blue))]",   icon:"bg-[rgb(var(--c-blue))]"   },
  purple: { bg:"bg-[rgb(var(--c-purple)/0.12)]", text:"text-[rgb(var(--c-purple))]", border:"border-l-[rgb(var(--c-purple))]", icon:"bg-[rgb(var(--c-purple))]" },
  red:    { bg:"bg-[rgb(var(--c-red)/0.12)]",    text:"text-[rgb(var(--c-red))]",    border:"border-l-[rgb(var(--c-red))]",    icon:"bg-[rgb(var(--c-red))]"    },
  teal:   { bg:"bg-[rgb(var(--c-teal)/0.12)]",   text:"text-[rgb(var(--c-teal))]",   border:"border-l-[rgb(var(--c-teal))]",   icon:"bg-[rgb(var(--c-teal))]"   },
  pink:   { bg:"bg-[rgb(var(--c-pink)/0.12)]",   text:"text-[rgb(var(--c-pink))]",   border:"border-l-[rgb(var(--c-pink))]",   icon:"bg-[rgb(var(--c-pink))]"   },
};

interface KpiCardProps {
  title: string;
  value: number | string | React.ReactNode;
  icon: React.ReactNode;
  color: KpiColor;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  href?: string;
  onClick?: () => void;
}
export function KpiCard({ title, value, icon, color, trend, trendValue, href, onClick }: KpiCardProps) {
  const c = KPI_COLORS[color];
  const isClickable = !!(href || onClick);
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => isClickable && e.key === "Enter" && onClick?.()}
      className={cn(
        "bg-[rgb(var(--card-bg))] rounded-2xl shadow-card border border-[rgb(var(--border))]",
        "border-l-4", c.border,
        "p-5 flex items-center gap-4",
        isClickable && "cursor-pointer card-lift",
        "slide-in"
      )}
    >
      {/* Coloured circle icon — exactly like reference */}
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-md", c.icon)}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink2 uppercase tracking-wider mb-0.5">{title}</p>
        <div className="flex items-end gap-2">
          <p className={cn("text-2xl font-bold tabular-nums leading-none", c.text)}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>

          {trend && (
            <span className={cn(
              "text-xs font-bold flex items-center gap-0.5 mb-0.5",
              trend === "up"   && "text-green-500",
              trend === "down" && "text-red-500",
              trend === "flat" && "text-gray-400",
            )}>
              {trend === "up"   && "▲"}
              {trend === "down" && "▼"}
              {trend === "flat" && "⇌"}
              {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────
export function SectionCard({ title, subtitle, children, action, noPadding }: {
  title: string; subtitle?: string; children: React.ReactNode;
  action?: React.ReactNode; noPadding?: boolean;
}) {
  return (
    <div className="bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-card overflow-hidden slide-in">
      <div className="px-5 py-3.5 border-b border-[rgb(var(--border))] flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-ink2 uppercase tracking-widest">
            {title}
          </p>
          {subtitle && <p className="text-xs text-ink3 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={noPadding ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}

// ── StatsCard ─────────────────────────────────────────────────────────
export function StatsCard({ title, value, subtitle, icon, color="blue" }: {
  title: string; value: string|number; subtitle?: string;
  icon?: React.ReactNode; color?: KpiColor;
}) {
  const c = KPI_COLORS[color as KpiColor] ?? KPI_COLORS.blue;
  return (
    <div className={cn("rounded-2xl border border-[rgb(var(--border))] border-l-4 p-5 flex items-start justify-between gap-3 slide-in bg-[rgb(var(--card-bg))] shadow-card", c.border)}>
      <div>
        <p className="text-xs font-semibold text-ink2 uppercase tracking-wider mb-1.5">{title}</p>
        <p className={cn("text-2xl font-bold tabular-nums", c.text)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-ink3 mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm", c.icon)}>
          {icon}
        </div>
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(
      "w-full h-9 px-3 rounded-xl bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))]",
      "text-ink text-sm placeholder:text-ink3",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400",
      "disabled:opacity-50",
      className
    )} {...p}/>
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn(
      "w-full px-3 py-2 rounded-xl bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))]",
      "text-ink text-sm placeholder:text-ink3 resize-none",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400",
      className
    )} {...p}/>
  )
);
Textarea.displayName = "Textarea";

// ── Label ─────────────────────────────────────────────────────────────
export function Label({ children, required, className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-xs font-semibold text-ink2 mb-1.5", className)} {...p}>
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

// ── Select ────────────────────────────────────────────────────────────
interface SelProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string; options: {value:string;label:string}[];
}
export function Select({ placeholder, options, className, ...p }: SelProps) {
  return (
    <select className={cn(
      "w-full h-9 px-3 rounded-xl bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))]",
      "text-ink text-sm cursor-pointer appearance-none",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400",
      className
    )} {...p}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── FormField ─────────────────────────────────────────────────────────
export function FormField({ label, required, error, hint, children, className }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-ink3">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────
export function Table({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return <div className="overflow-x-auto"><table className={cn("w-full text-sm", className)}>{children}</table></div>;
}
export function Th({ className, children, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn(
      "px-4 py-2.5 text-left text-2xs font-bold text-ink2 uppercase tracking-widest",
      "bg-[rgb(var(--page-bg))] border-b border-[rgb(var(--border))] whitespace-nowrap",
      className
    )} {...p}>{children}</th>
  );
}
export function Td({ className, children, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-ink2 border-b border-[rgb(var(--border))/50]", className)} {...p}>{children}</td>;
}
export function Tr({ className, children, onClick, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn(
      "bg-[rgb(var(--card-bg))] transition-colors",
      onClick && "cursor-pointer hover:bg-[rgb(var(--page-bg))]",
      className
    )} onClick={onClick} {...p}>{children}</tr>
  );
}

// ── TableSkeleton ─────────────────────────────────────────────────────
export function TableSkeleton({ rows=8, cols=7 }: { rows?: number; cols?: number }) {
  const ws = [80,160,80,110,90,70,70];
  return (
    <>
      {Array.from({length:rows}).map((_,i) => (
        <tr key={i} className="bg-[rgb(var(--card-bg))]">
          {Array.from({length:cols}).map((_,j) => (
            <td key={j} className="px-4 py-3 border-b border-[rgb(var(--border))/30]">
              <div className="skel" style={{width:ws[j%ws.length],height:12}}/>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────
export function Tabs({ tabs, value, onChange, className }: {
  tabs:{value:string;label:string;count?:number}[];
  value:string; onChange:(v:string)=>void; className?:string;
}) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-[rgb(var(--border))]", className)}>
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-colors border-b-2 -mb-px",
            value===tab.value
              ? "border-blue-500 text-blue-500"
              : "border-transparent text-ink3 hover:text-ink2"
          )}>
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "px-1.5 py-0.5 rounded-lg text-2xs font-bold",
              value===tab.value ? "bg-blue-100 text-blue-600 dark:bg-blue-950" : "bg-[rgb(var(--page-bg))] text-ink3"
            )}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, limit, onPageChange }: {
  page:number; totalPages:number; total:number; limit:number; onPageChange:(p:number)=>void;
}) {
  const from=(page-1)*limit+1, to=Math.min(page*limit,total);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[rgb(var(--border))] bg-[rgb(var(--page-bg))]">
      <span className="text-xs text-ink3">{from}–{to} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={()=>onPageChange(page-1)} disabled={page<=1}>← Prev</Button>
        <span className="px-3 text-xs font-semibold text-ink2">{page} / {totalPages}</span>
        <Button size="sm" variant="outline" onClick={()=>onPageChange(page+1)} disabled={page>=totalPages}>Next →</Button>
      </div>
    </div>
  );
}

// ── Spinner / Skeleton / Loading / Empty ──────────────────────────────
export function Spinner({ size=16, className }: { size?: number; className?: string }) {
  return <span style={{width:size,height:size}} className={cn("animate-spin border-2 border-[rgb(var(--border))] border-t-blue-500 rounded-full inline-block shrink-0", className)}/>;
}
export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skel", className)} {...p}/>;
}
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <Spinner size={24}/>
    </div>
  );
}
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center slide-in">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] flex items-center justify-center mb-4 text-ink3">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold text-ink mb-1">{title}</p>
      {description && <p className="text-xs text-ink3 max-w-xs leading-relaxed mt-1">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions, border=true }: {
  title:string; subtitle?:string; actions?:React.ReactNode; border?:boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-6 py-5 bg-[rgb(var(--card-bg))]",
      border && "border-b border-[rgb(var(--border))]"
    )}>
      <div>
        <h1 className="text-xl font-bold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-ink3 mt-0.5 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 ml-6 shrink-0">{actions}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, size="md" }: {
  open:boolean; onClose:()=>void; title:string; subtitle?:string;
  children:React.ReactNode; footer?:React.ReactNode; size?:"sm"|"md"|"lg"|"xl";
}) {
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  const sz = {sm:"max-w-sm", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-4xl"};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className={cn("relative w-full bg-[rgb(var(--card-bg))] rounded-2xl shadow-card-lg border border-[rgb(var(--border))] slide-in overflow-hidden", sz[size])}>
        <div className="px-5 py-4 border-b border-[rgb(var(--border))] flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-ink3 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-4 p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-[rgb(var(--page-bg))] transition-colors">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="px-5 py-5 max-h-[65vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[rgb(var(--border))] bg-[rgb(var(--page-bg))] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────
export function ConfirmDialog({ open, title, description, onConfirm, onCancel, loading, destructive, confirmLabel }: {
  open:boolean; title:string; description:string; onConfirm:()=>void; onCancel:()=>void;
  loading?:boolean; destructive?:boolean; confirmLabel?:string;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant={destructive?"danger":"primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel??(destructive?"Delete":"Confirm")}
        </Button>
      </>}>
      <p className="text-sm text-ink2 leading-relaxed">{description}</p>
    </Modal>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────
type TType = "success"|"error"|"info"|"warning";
let _set: React.Dispatch<React.SetStateAction<{id:number;msg:string;type:TType}[]>>|null = null;
export function toast(msg: string, type: TType = "info") {
  if (!_set) return;
  const id = Date.now();
  _set(p => [...p.slice(-4), {id,msg,type}]);
  setTimeout(() => _set!(p => p.filter(t => t.id!==id)), 4000);
}
export function Toaster() {
  const [toasts, set] = React.useState<{id:number;msg:string;type:TType}[]>([]);
  React.useEffect(() => { _set = set; return () => { _set=null; }; }, []);
  const s: Record<TType,string> = {
    success:"bg-green-500",
    error:"bg-red-500",
    warning:"bg-amber-500",
    info:"bg-blue-500",
  };
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-card-lg pointer-events-auto slide-in max-w-xs", s[t.type])}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────
export function SearchInput({ className, value, onClear, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { onClear?:()=>void }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
      </svg>
      <Input className={cn("pl-9", value && onClear && "pr-8", className)} value={value} {...p}/>
      {value && onClear && (
        <button onClick={onClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink transition-colors">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}
    </div>
  );
}

// ── DetailGrid / Field ────────────────────────────────────────────────
export function DetailGrid({ children, cols=3 }: { children:React.ReactNode; cols?:2|3|4 }) {
  const g={2:"grid-cols-1 sm:grid-cols-2",3:"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",4:"grid-cols-2 sm:grid-cols-4"};
  return <div className={cn("grid gap-x-6 gap-y-4",g[cols])}>{children}</div>;
}
export function DetailField({ label, value, mono }: { label:string; value?:string|null; mono?:boolean }) {
  return (
    <div>
      <dt className="text-2xs font-bold text-ink2 uppercase tracking-widest mb-0.5">{label}</dt>
      <dd className={cn("text-sm text-ink", !value && "text-ink3", mono && "font-mono text-xs")}>{value||"—"}</dd>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────
export function Divider({ label, className }: { label?:string; className?:string }) {
  if (label) return (
    <div className={cn("flex items-center gap-3 my-4",className)}>
      <div className="flex-1 border-t border-[rgb(var(--border))]"/>
      <span className="text-2xs font-bold text-ink3 uppercase tracking-widest">{label}</span>
      <div className="flex-1 border-t border-[rgb(var(--border))]"/>
    </div>
  );
  return <hr className={cn("border-[rgb(var(--border))] my-4",className)}/>;
}
