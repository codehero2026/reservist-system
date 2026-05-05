// src/pages/ReportsPage.tsx — Full export/print suite
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, Printer, FileSpreadsheet, FileText,
  File, BarChart3, Shirt, RefreshCw, ChevronDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { reportsApi, personnelApi } from "../lib/api";
import {
  Button, Card, CardHeader, CardTitle, CardContent,
  PageHeader, Select, Label, SectionCard, Spinner,
  Badge, ConfirmDialog,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { cn } from "../lib/utils";
import type { Reservist } from "../types";

// XLSX + PDF + DOCX + CSV
import * as XLSX from "xlsx";

const CHART_COLORS = ["rgb(37,99,235)","rgb(22,163,74)","rgb(217,119,6)","rgb(220,38,38)","rgb(124,58,237)","rgb(8,145,178)"];

// ─── Export format button ────────────────────────────────────────────
function ExportBtn({ icon: Icon, label, onClick, disabled, loading }: {
  icon: React.ElementType; label: string; onClick: () => void;
  disabled?: boolean; loading?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5"
    >
      {loading ? <Spinner size={12} /> : <Icon size={13} />}
      {label}
    </Button>
  );
}

// ─── Print styles optimized for professional reports ───────────────
const PRINT_STYLES = `
@media print {
  @page {
    size: A4 landscape;
    margin: 15mm 10mm;
  }
  
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: white !important;
    color: black !important;
    font-size: 9pt !important;
  }

  /* Hide everything by default */
  body * { visibility: hidden; pointer-events: none; }
  
  /* Show print area */
  #print-area, #print-area * { visibility: visible; }
  
  #print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 0;
    margin: 0;
    display: block !important;
  }

  /* Hide web-only UI elements */
  .print-hide, .actions-bar, button, .lucide { display: none !important; }

  /* Professional Table Styling */
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin-top: 20px;
    table-layout: auto;
    border: 1.5pt solid #000;
  }
  
  th { 
    background-color: #f1f5f9 !important;
    color: #000 !important;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 8pt;
    padding: 8px 6px;
    border: 1pt solid #000;
    text-align: left;
  }
  
  td { 
    padding: 6px 6px; 
    border: 1pt solid #000; 
    font-size: 8.5pt;
    vertical-align: middle;
  }

  tr { page-break-inside: avoid; }

  /* Header / Branding */
  .print-header { 
    display: flex !important;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 25px;
    border-bottom: 2pt solid #000;
    padding-bottom: 15px;
  }
  
  .print-header h1 { 
    font-size: 20pt; 
    font-weight: 800; 
    margin: 0; 
    text-transform: uppercase;
    letter-spacing: 1pt;
  }
  
  .print-header p { 
    font-size: 10pt; 
    margin: 4px 0 0;
    font-weight: 500;
  }

  .print-footer {
    display: block !important;
    margin-top: 30px;
    font-size: 8pt;
    text-align: right;
    border-top: 1pt solid #ddd;
    padding-top: 10px;
    font-style: italic;
  }

  /* Force display of these sections in print */
  .print-visible { display: block !important; }
}
`;

// ─── ReportsPage ─────────────────────────────────────────────────────
export function ReportsPage() {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Filters
  const [company,  setCompany]  = useState("");
  const [status,   setStatus]   = useState("");
  const [platoon,  setPlatoon]  = useState("");

  // Loading states per export type
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingCsv,  setLoadingCsv]  = useState(false);
  const [loadingPdf,  setLoadingPdf]  = useState(false);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPrint,setLoadingPrint]= useState(false);

  // Confirm State
  const [confirmExport, setConfirmExport] = useState<{ type: string; label: string } | null>(null);

  // Data queries
  const rosterParams: Record<string, string> = {};
  if (company) rosterParams.company = company;
  if (status)  rosterParams.status  = status;
  if (platoon) rosterParams.platoon = platoon;

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ["reports-roster", rosterParams],
    queryFn: async () => (await reportsApi.roster(rosterParams)).data,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: async () => (await reportsApi.summary()).data,
  });

  const { data: uniforms } = useQuery({
    queryKey: ["reports-uniforms", company],
    queryFn: async () => (await reportsApi.uniforms(company ? { company } : {})).data,
  });

  const { data: opts } = useQuery({
    queryKey: ["personnel-options"],
    queryFn: async () => (await personnelApi.options()).data,
  });

  const records: Reservist[] = roster?.data ?? [];
  const isEmpty = records.length === 0;

  // ─── Dynamic filename ──────────────────────────────────────────────
  function filename(ext: string) {
    const parts = ["H12RCDG_Roster"];
    if (company) parts.push(company);
    if (status)  parts.push(status);
    parts.push(new Date().toISOString().slice(0, 10));
    return `${parts.join("_")}.${ext}`;
  }

  // ─── Row map for exports ───────────────────────────────────────────
  function toRow(r: Reservist, i: number) {
    return {
      "#": i + 1,
      AFPSN: r.afpsn,
      Rank: r.rankCode,
      "Last Name": r.lastName,
      "First Name": r.firstName,
      "Middle Name": r.middleName ?? "",
      Company: r.company ?? "",
      Platoon: r.platoon ?? "",
      "Squad/Section": r.squadTeamSection ?? "",
      Designation: r.designationCode ?? "",
      Status: r.reservistStatus,
      "Mobile No.": r.mobileTelNo ?? "",
    };
  }

  // ─── Trigger Confirm ──────────────────────────────────────────────
  function triggerExport(type: "XLSX" | "CSV" | "PRINT") {
    const labels: Record<string, string> = {
      XLSX: "Excel Spreadsheet",
      CSV:  "CSV Data File",
      PRINT: "Print Preview"
    };
    setConfirmExport({ type, label: labels[type] });
  }

  async function executeExport() {
    if (!confirmExport) return;
    const type = confirmExport.type;
    setConfirmExport(null);

    if (type === "XLSX")  await exportXlsx();
    if (type === "CSV")   await exportCsv();
    if (type === "PRINT") handlePrint();
  }

  // ─── XLSX export ──────────────────────────────────────────────────
  async function exportXlsx() {
    if (rosterLoading) return toast("Waiting for live data...", "info");
    if (!records.length) return toast("No data to export", "error");
    setLoadingXlsx(true);
    try {
      const ws = XLSX.utils.json_to_sheet(records.map(toRow));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Roster");
      XLSX.writeFile(wb, filename("xlsx"));
      toast(`Excel export successful`, "success");
    } catch {
      toast("XLSX export failed", "error");
    } finally {
      setLoadingXlsx(false);
    }
  }

  // ─── CSV export ───────────────────────────────────────────────────
  async function exportCsv() {
    setLoadingCsv(true);
    try {
      const rows = records.map(toRow);
      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(","),
        ...rows.map(r =>
          headers.map(h => {
            const val = String((r as Record<string, unknown>)[h] ?? "");
            return val.includes(",") ? `"${val}"` : val;
          }).join(",")
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename("csv"); a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${records.length} records to CSV`, "success");
    } catch {
      toast("CSV export failed", "error");
    } finally {
      setLoadingCsv(false);
    }
  }


  // ─── Print ────────────────────────────────────────────────────────

  // ─── Print ────────────────────────────────────────────────────────
  function handlePrint() {
    if (rosterLoading) return toast("Waiting for data fetch...", "info");
    if (!records.length) return toast("Report is empty", "warning");
    setLoadingPrint(true);
    let styleEl = document.getElementById("print-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "print-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = PRINT_STYLES;
    setTimeout(() => { window.print(); setLoadingPrint(false); }, 100);
  }

  return (
    <div className="in flex flex-col h-full">
      <PageHeader title="Reports" subtitle="Export and analyse personnel data" />

      {/* ── Filter + Export bar ──────────────────────────────── */}
      <div className="bg-[rgb(var(--card))] border-b border-[rgb(var(--border))] px-5 py-3">
        <div className="flex items-end gap-4 flex-wrap">

          {/* Filters */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="w-40">
              <Label>Company</Label>
              <Select value={company} onChange={e => setCompany(e.target.value)}
                placeholder="All companies"
                options={(opts?.companies ?? []).map((c: string) => ({ value: c, label: c }))} />
            </div>
            <div className="w-36">
              <Label>Status</Label>
              <Select value={status} onChange={e => setStatus(e.target.value)}
                placeholder="All statuses"
                options={["READY","STANDBY","RETIRED","DISCHARGED"].map(s => ({ value: s, label: s }))} />
            </div>
            <div className="w-36">
              <Label>Platoon</Label>
              <Select value={platoon} onChange={e => setPlatoon(e.target.value)}
                placeholder="All platoons"
                options={(opts?.platoons ?? []).map((p: string) => ({ value: p, label: p }))} />
            </div>
          </div>

          <div className="flex-1" />

          {/* Record count badge */}
          {!rosterLoading && (
            <Badge variant={isEmpty ? "default" : "blue"} className="text-xs">
              {isEmpty ? "No records" : `${records.length.toLocaleString()} records`}
            </Badge>
          )}

          {/* Export controls */}
          <div className="flex items-center gap-2 bg-[rgb(var(--subtle))] p-1 rounded-lg border border-[rgb(var(--border-soft))]">
            <div className="flex items-center px-2 mr-1">
              <span className="text-[10px] text-[rgb(var(--ink-3))] font-bold uppercase tracking-widest">Export As</span>
            </div>
            <div className="flex gap-1">
              <ExportBtn icon={FileSpreadsheet} label="XLSX" onClick={() => triggerExport("XLSX")} disabled={isEmpty} loading={loadingXlsx} />
              <ExportBtn icon={File}            label="CSV"  onClick={() => triggerExport("CSV")}  disabled={isEmpty} loading={loadingCsv}  />
            </div>
            <div className="w-px h-5 bg-[rgb(var(--border))] mx-1" />
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => triggerExport("PRINT")} 
              disabled={isEmpty} 
              loading={loadingPrint}
              className="px-4"
            >
              <Printer size={13} /> Print Roster
            </Button>
          </div>
        </div>

        {isEmpty && !rosterLoading && (
          <p className="text-xs text-[rgb(var(--amber))] mt-2">
            ⚠ No records match the current filters. Export and print are disabled.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5 max-w-[1300px] mx-auto w-full" id="print-area" ref={printAreaRef}>

        {/* Print header (visible only in print) */}
        <div className="print-header hidden">
          <h1>H12RCDG Reservist Management System</h1>
          <p className="mt-1 font-bold text-lg">Personnel Roster Master List</p>
          <div className="text-sm mt-3 flex justify-center gap-4 text-gray-600">
            <span>Generated: {new Date().toLocaleString()}</span>
            {company && <span>Company: {company}</span>}
            {status && <span>Status: {status}</span>}
          </div>
        </div>

        {/* ── Summary charts ──────────────────────────────────── */}
        {!summaryLoading && summary && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 print:hidden">
            <SectionCard title="Personnel by Company" subtitle="Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={summary.byCompany} margin={{ top: 4, right: 0, left: -24, bottom: 0 }} barSize={28}>
                  <XAxis dataKey="company" tick={{ fill: "rgb(168,162,158)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgb(168,162,158)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="_count.id" name="Count" fill="rgb(37,99,235)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Status Distribution">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={summary.byStatus.map((s: { reservistStatus: string; _count: { id: number } }) => ({ name: s.reservistStatus, value: s._count.id }))}
                    dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3} strokeWidth={0}
                  >
                    {summary.byStatus.map((_: unknown, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {summary.byStatus.map((s: { reservistStatus: string; _count: { id: number } }, i: number) => (
                  <span key={s.reservistStatus} className="flex items-center gap-1.5 text-xs text-[rgb(var(--ink-2))]">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s.reservistStatus} ({s._count.id})
                  </span>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Rank grid ────────────────────────────────────────── */}
        {summary && (
          <SectionCard title="Rank Distribution">
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
              {summary.byRank.map((r: { rankCode: string; _count: { id: number } }) => (
                <div key={r.rankCode} className="bg-[rgb(var(--subtle))] rounded-lg p-2.5 text-center border border-[rgb(var(--border))]">
                  <p className="text-sm font-bold text-[rgb(var(--ink))] tabular-nums">{r._count.id}</p>
                  <p className="text-2xs text-[rgb(var(--ink-3))] mt-0.5">{r.rankCode}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Uniform sizes ─────────────────────────────────────── */}
        {uniforms && (
          <SectionCard title={`Uniform Sizes${company ? ` — ${company}` : ""}`} action={<Shirt size={14} className="text-[rgb(var(--ink-3))]" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Boot Sizes", data: uniforms.byBoots, key: "sizeBoots" },
                { label: "Cap Sizes",  data: uniforms.byCaps,  key: "sizeCaps"  },
                { label: "BDA Sizes",  data: uniforms.byBda,   key: "sizeBda"   },
              ].map(({ label, data: rows, key }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-[rgb(var(--ink-2))] mb-2">{label}</p>
                  <div className="space-y-1.5">
                    {(rows ?? []).slice(0, 8).map((r: Record<string, unknown>, i: number) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-[rgb(var(--ink-2))]">{String(r[key] ?? "Unknown")}</span>
                        <span className="text-xs font-semibold text-[rgb(var(--ink))] tabular-nums">
                          {String((r._count as Record<string, unknown>)?.id ?? r.count ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Roster table (printable) ─────────────────────────── */}
        <SectionCard
          title="Personnel Roster"
          subtitle={`${records.length.toLocaleString()} records${company ? ` · ${company}` : ""}${status ? ` · ${status}` : ""}`}
          noPadding
        >
          {rosterLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : isEmpty ? (
            <p className="text-xs text-[rgb(var(--ink-3))] text-center py-8">No records match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["#","AFPSN","Rank","Last Name","First Name","Company","Platoon","Squad","Designation","Status","Mobile"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-[rgb(var(--ink-3))] uppercase tracking-wide bg-[rgb(var(--subtle))] border-b border-[rgb(var(--border))] text-2xs whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={cn("border-b border-[rgb(var(--border-soft))]", i % 2 === 0 ? "bg-[rgb(var(--card))]" : "bg-[rgb(var(--subtle))]")}>
                      <td className="px-3 py-2 text-[rgb(var(--ink-3))] tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2 font-mono">{r.afpsn}</td>
                      <td className="px-3 py-2">{r.rankCode}</td>
                      <td className="px-3 py-2 font-medium text-[rgb(var(--ink))]">{r.lastName}</td>
                      <td className="px-3 py-2">{r.firstName}</td>
                      <td className="px-3 py-2">{r.company ?? "—"}</td>
                      <td className="px-3 py-2">{r.platoon ?? "—"}</td>
                      <td className="px-3 py-2">{r.squadTeamSection ?? "—"}</td>
                      <td className="px-3 py-2">{r.designationCode ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-2xs font-medium border",
                          r.reservistStatus === "READY"      && "bg-[rgb(var(--green-bg))] text-[rgb(var(--green))] border-[rgb(var(--green)/0.15)]",
                          r.reservistStatus === "STANDBY"    && "bg-[rgb(var(--amber-bg))] text-[rgb(var(--amber))] border-[rgb(var(--amber)/0.2)]",
                          r.reservistStatus === "RETIRED"    && "bg-[rgb(var(--subtle))] text-[rgb(var(--ink-3))] border-[rgb(var(--border))]",
                          r.reservistStatus === "DISCHARGED" && "bg-[rgb(var(--red-bg))] text-[rgb(var(--red))] border-[rgb(var(--red)/0.15)]",
                        )}>
                          {r.reservistStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[rgb(var(--ink-3))]">{r.mobileTelNo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 text-2xs text-[rgb(var(--ink-3))] border-t border-[rgb(var(--border))] bg-[rgb(var(--subtle))]">
                {records.length.toLocaleString()} records · Generated {new Date().toLocaleString()} · H12RCDG Reservist Management System
              </div>
            </div>
          )}
        </SectionCard>

        {/* Print footer */}
        <div className="print-footer hidden">
          Printed from H12RCDG Reservist System | Authenticated Session: {new Date().toISOString()} | Page Footer Info
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmExport}
        title="Export Confirmation"
        description={`Do you want to export this report as ${confirmExport?.label}?`}
        confirmLabel="Yes, Export"
        onConfirm={executeExport}
        onCancel={() => setConfirmExport(null)}
      />
    </div>
  );
}
