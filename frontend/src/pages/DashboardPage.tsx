// src/pages/DashboardPage.tsx
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users, CheckCircle2, Clock, GitMerge, TrendingUp,
  AlertTriangle, Upload, Activity, UserCheck, RefreshCw,
  Megaphone, Pin, Plus, FileUp, ShieldCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Area, AreaChart,
} from "recharts";
import { dashboardApi, announcementsApi } from "../lib/api";
import { KpiCard, SectionCard, LoadingPage, PageHeader, Button, Skeleton, Badge } from "../components/ui/index";
import { cn, formatDateTime } from "../lib/utils";
import type { DashboardStats, AuditLog } from "../types";

// ── Count-up hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

// ── Readiness gauge (SVG arc) ─────────────────────────────────────────
function ReadinessGauge({ ready, total }: { ready: number; total: number }) {
  const pct = total > 0 ? ready / total : 0;
  const animPct = useCountUp(Math.round(pct * 100)) / 100;
  const R = 54, cx = 70, cy = 74;
  const startAngle = -210, sweepAngle = 240;
  function polarToXY(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPath(from: number, to: number, r: number) {
    const s = polarToXY(from, r);
    const e = polarToXY(to, r);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }
  const trackStart = startAngle;
  const trackEnd = startAngle + sweepAngle;
  const fillEnd = startAngle + sweepAngle * animPct;
  const color = pct >= 0.7 ? "#22c55e" : pct >= 0.4 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <svg width={140} height={120} className="overflow-visible">
        {/* Track */}
        <path d={arcPath(trackStart, trackEnd, R)} fill="none" stroke="rgb(var(--border))" strokeWidth={10} strokeLinecap="round"/>
        {/* Fill */}
        {animPct > 0 && (
          <path d={arcPath(trackStart, fillEnd, R)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}/>
        )}
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-[rgb(var(--text-primary))] font-bold" fontSize={22} fontFamily="Inter">
          {Math.round(animPct * 100)}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgb(var(--text-secondary))" fontSize={10} fontFamily="Inter">
          READINESS
        </text>
      </svg>
      <div className="flex gap-4 text-center mt-1">
        <div>
          <p className="text-lg font-bold text-green-500 tabular-nums">{ready.toLocaleString()}</p>
          <p className="text-2xs text-ink3 font-medium uppercase tracking-wide">Ready</p>
        </div>
        <div className="w-px bg-[rgb(var(--border))]"/>
        <div>
          <p className="text-lg font-bold text-ink tabular-nums">{total.toLocaleString()}</p>
          <p className="text-2xs text-ink3 font-medium uppercase tracking-wide">Total</p>
        </div>
      </div>
    </div>
  );
}

// ── Last Updated ──────────────────────────────────────────────────────
function LastUpdated({ updatedAt }: { updatedAt: Date }) {
  const [label, setLabel] = useState("just now");
  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
      if (secs < 60) setLabel(`${secs}s ago`);
      else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`);
      else setLabel(`${Math.floor(secs / 3600)}h ago`);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [updatedAt]);
  return (
    <span className="flex items-center gap-1 text-2xs text-ink3 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      Updated {label}
    </span>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl px-3 py-2 shadow-card-md text-xs">
      <p className="font-bold text-ink mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-ink2">{p.name ?? "Count"}: <span className="font-bold text-ink">{p.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
}

// ── Animated KPI number ───────────────────────────────────────────────
function AnimatedKpi({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated.toLocaleString()}</>;
}

// ── Action pill map ───────────────────────────────────────────────────
const ACTION_PILL: Record<string, { label: string; v: "green" | "blue" | "red" | "amber" | "purple" | "default" }> = {
  CREATE:         { label: "Created",  v: "green" },
  UPDATE:         { label: "Updated",  v: "blue" },
  DELETE:         { label: "Deleted",  v: "red" },
  IMPORT:         { label: "Imported", v: "purple" },
  DEDUP_MERGE:    { label: "Merged",   v: "amber" },
  LOGIN:          { label: "Login",    v: "default" },
  SETTINGS_UPDATE:{ label: "Settings", v: "default" },
  BACKUP:         { label: "Backup",   v: "blue" },
  BATCH_UPDATE:   { label: "Batch",    v: "purple" },
  ANNOUNCEMENT:   { label: "Announce", v: "green" },
  RESTORE:        { label: "Restore",  v: "amber" },
};

// ── Page ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const navigate = useNavigate();
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const { data: stats, isLoading, isRefetching, refetch, dataUpdatedAt } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await dashboardApi.stats()).data,
    refetchInterval: 60_000,
  });
  const { data: activity, isLoading: actLoading } = useQuery<{ data: AuditLog[] }>({
    queryKey: ["dashboard-activity"],
    queryFn: async () => (await dashboardApi.activity()).data,
    refetchInterval: 30_000,
  });
  const { data: announcements } = useQuery({
    queryKey: ["dashboard-announcements"],
    queryFn: async () => (await announcementsApi.list()).data,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (dataUpdatedAt) setUpdatedAt(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);

  const activeAnnouncements = (announcements?.data ?? []).slice(0, 3);

  if (isLoading) return <LoadingPage />;
  if (!stats) return null;

  const { kpi, byCompany, byRank, recentImports, enrollmentTrend } = stats;

  const statusData = [
    { name: "Ready",      value: kpi.ready,      color: "#22c55e" },
    { name: "Standby",    value: kpi.standby,    color: "#f59e0b" },
    { name: "Retired",    value: kpi.retired ?? 0,    color: "#94a3b8" },
    { name: "Discharged", value: kpi.discharged ?? 0, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Personnel registry overview"
        actions={
          <div className="flex items-center gap-3">
            <LastUpdated updatedAt={updatedAt} />
            <Button variant="outline" size="sm" onClick={() => { refetch(); setUpdatedAt(new Date()); }} loading={isRefetching}>
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-[1400px]">

        {/* ── Quick Actions ────────────────────────────────────── */}
        <div className="bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[rgb(var(--border))] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-ink2 uppercase tracking-widest">Quick Actions</p>
              <p className="text-xs text-ink3 mt-0.5">Shortcuts to common operations</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: <Plus size={18} />,
                label: "Add Personnel",
                sub: "Create a new record",
                color: "bg-blue-500",
                onClick: () => navigate("/personnel"),
              },
              {
                icon: <FileUp size={18} />,
                label: "Import Data",
                sub: `${kpi.recentlyAdded} added this month`,
                color: "bg-purple-500",
                onClick: () => navigate("/import"),
              },
              {
                icon: <ShieldCheck size={18} />,
                label: "Resolve Duplicates",
                sub: kpi.pendingDedup > 0 ? `${kpi.pendingDedup} pending` : "All clear",
                color: kpi.pendingDedup > 0 ? "bg-amber-500" : "bg-green-500",
                onClick: () => navigate("/dedup"),
              },
            ].map(({ icon, label, sub, color, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex items-center gap-4 p-4 bg-[rgb(var(--page-bg))] border border-[rgb(var(--border))] rounded-xl card-lift text-left group hover:border-blue-400/40 transition-colors"
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md transition-transform duration-200 group-hover:scale-110", color)}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{label}</p>
                  <p className="text-xs text-ink3">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Row 1 ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard title="Total Personnel" value={<AnimatedKpi value={kpi.total} />} icon={<Users size={20} />} color="blue" trend="up" trendValue={`${kpi.recentlyAdded} new`} onClick={() => navigate("/personnel")} />
          <KpiCard title="Ready Status" value={<AnimatedKpi value={kpi.ready} />} icon={<CheckCircle2 size={20} />} color="green" trend="up" trendValue={`${Math.round((kpi.ready / Math.max(kpi.total, 1)) * 100)}%`} onClick={() => navigate("/personnel?status=READY")} />
          <KpiCard title="New (30 days)" value={<AnimatedKpi value={kpi.recentlyAdded} />} icon={<TrendingUp size={20} />} color="yellow" trend="up" onClick={() => navigate("/personnel")} />
        </div>

        {/* ── KPI Row 2 ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard title="Standby" value={<AnimatedKpi value={kpi.standby} />} icon={<Clock size={20} />} color="orange" trend="flat" onClick={() => navigate("/personnel?status=STANDBY")} />
          <KpiCard title="Duplicate AFPSNs" value={<AnimatedKpi value={kpi.duplicates} />} icon={<AlertTriangle size={20} />} color="purple" trend={kpi.duplicates > 0 ? "up" : "flat"} trendValue="flagged" onClick={() => navigate("/personnel?isDuplicate=true")} />
          <KpiCard title="Pending Dedup" value={<AnimatedKpi value={kpi.pendingDedup} />} icon={<GitMerge size={20} />} color="red" trend={kpi.pendingDedup > 0 ? "down" : "flat"} trendValue="to resolve" onClick={() => navigate("/dedup?status=PENDING")} />
        </div>

        {/* ── Announcements ─────────────────────────────────────── */}
        {activeAnnouncements.length > 0 && (
          <SectionCard title="Bulletin" subtitle="Latest announcements" action={<Megaphone size={13} className="text-ink3" />}>
            <div className="space-y-3">
              {activeAnnouncements.map((a: { id: number; title: string; content: string; priority: string; isPinned: boolean; createdAt: string; createdBy: { fullName: string } }) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", a.priority === "urgent" ? "bg-red-500/10 text-red-500" : a.priority === "high" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500")}>
                    {a.isPinned ? <Pin size={13} /> : <Megaphone size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{a.title}</p>
                    <p className="text-2xs text-ink3 line-clamp-1">{a.content}</p>
                    <p className="text-2xs text-ink3 mt-0.5">{a.createdBy.fullName} · {formatDateTime(a.createdAt)}</p>
                  </div>
                  {a.priority === "urgent" && <Badge variant="red">Urgent</Badge>}
                  {a.priority === "high" && <Badge variant="amber">High</Badge>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Company bar + Readiness gauge ─────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SectionCard title="Graph" subtitle="Personnel by company">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byCompany} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                  <XAxis dataKey="company" tick={{ fill: "rgb(var(--text-secondary))", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgb(var(--text-secondary))", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgb(var(--page-bg))", radius: 4 }} />
                  <Bar dataKey="count" name="Personnel" fill="rgb(var(--c-blue))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Gauge" subtitle="Force readiness">
            <ReadinessGauge ready={kpi.ready} total={kpi.total} />
          </SectionCard>
        </div>

        {/* ── Enrollment trend + Status donut ───────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SectionCard title="Trend" subtitle="30-day enrollment">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={enrollmentTrend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--c-blue))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--c-blue))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "rgb(var(--text-secondary))", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "rgb(var(--text-secondary))", fontSize: 10, fontFamily: "Inter" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "rgb(var(--border))" }} />
                  <Area type="monotone" dataKey="count" name="Enrolled" stroke="rgb(var(--c-blue))" strokeWidth={2} fill="url(#trendGrad)" dot={false} activeDot={{ r: 4, fill: "rgb(var(--c-blue))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Graph" subtitle="Status distribution">
            {statusData.length === 0 ? (
              <p className="text-xs text-ink3 py-4 text-center">No data</p>
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} strokeWidth={0}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgb(var(--card-bg))", border: "1px solid rgb(var(--border))", borderRadius: 12, fontSize: 12, fontFamily: "Inter" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-ink2 font-medium">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(d.value / kpi.total) * 100}%`, background: d.color }} />
                        </div>
                        <span className="text-xs font-bold text-ink tabular-nums w-8 text-right">{d.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Bottom row ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Rank pie */}
          <SectionCard title="Graph" subtitle="Top ranks">
            {(() => {
              const COLORS = ["rgb(var(--c-blue))", "rgb(var(--c-green))", "rgb(var(--c-orange))", "rgb(var(--c-purple))", "rgb(var(--c-red))", "rgb(var(--c-teal))"];
              return (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={byRank.slice(0, 6)} dataKey="count" nameKey="rank" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={3} strokeWidth={0}>
                        {byRank.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "rgb(var(--card-bg))", border: "1px solid rgb(var(--border))", borderRadius: 12, fontSize: 12, fontFamily: "Inter" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {byRank.slice(0, 6).map((r, i) => (
                      <div key={r.rank} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-ink2 font-medium">{r.rank}</span>
                        </div>
                        <span className="text-xs font-bold text-ink tabular-nums">{r.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </SectionCard>

          {/* Recent imports */}
          <SectionCard title="Table" subtitle="Recent imports" action={<Upload size={13} className="text-ink3" />}>
            {recentImports.length === 0 ? (
              <p className="text-xs text-ink3 py-4 text-center">No imports yet.</p>
            ) : (
              <div className="space-y-3">
                {recentImports.map(imp => (
                  <div key={imp.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[rgb(var(--c-blue)/0.12)] flex items-center justify-center shrink-0">
                      <Upload size={13} className="text-[rgb(var(--c-blue))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{imp.filename}</p>
                      <p className="text-2xs text-ink3">{imp.uploadedBy.fullName} · {formatDateTime(imp.createdAt)}</p>
                    </div>
                    <span className="text-xs font-bold text-[rgb(var(--c-green))] shrink-0">+{imp.successRows.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Activity */}
          <SectionCard title="Activity" subtitle="Recent actions" action={<Activity size={13} className="text-ink3" />}>
            {actLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3"><Skeleton className="h-5 w-16 rounded-lg" /><Skeleton className="h-3 flex-1 mt-1" /></div>
                ))}
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-[rgb(var(--border))]">
                {(activity?.data ?? []).slice(0, 6).map(log => {
                  const pill = ACTION_PILL[log.action] ?? { label: log.action, v: "default" };
                  return (
                    <div key={log.id} className="flex items-center gap-3 py-2.5">
                      <Badge variant={pill.v}>{pill.label}</Badge>
                      <p className="text-xs text-ink2 flex-1 truncate">{log.notes ?? `${log.tableName} #${log.recordId}`}</p>
                      <span className="text-2xs text-ink3 shrink-0">{formatDateTime(log.createdAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
