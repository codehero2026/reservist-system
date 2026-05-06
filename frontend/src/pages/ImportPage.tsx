// src/pages/ImportPage.tsx
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, FileSpreadsheet, RotateCcw, History,
} from "lucide-react";
import { importApi, systemApi } from "../lib/api";
import {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Table, Th, Td, Tr, Spinner, PageHeader, Pagination,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { cn, formatDateTime } from "../lib/utils";
import type { ImportPreviewResult, ImportPreviewRow } from "../types";

const STEPS = ["Upload File", "Preview & Validate", "Confirm Import"];

type CommitResult = {
  batchId: number;
  successRows: number;
  errorRows: number;
  dupRows: number;
  errorLog: { row: number; error: string }[];
};

export function ImportPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "warning" | "error">("all");
  const [previewPage, setPreviewPage] = useState(1);
  const [result, setResult] = useState<CommitResult | null>(null);
  const PREVIEW_PAGE_SIZE = 50;

  // Step 1 — upload & preview
  const previewMutation = useMutation({
    mutationFn: (f: File) => importApi.preview(f),
    onSuccess: (res) => {
      setPreview(res.data);
      setStep(1);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast(e?.response?.data?.error || "Failed to parse file", "error");
    },
  });

  // Step 3 — commit
  const commitMutation = useMutation({
    mutationFn: () => {
      const rowsToImport = preview!.rows
        .filter((r) => r.status !== "error")
        .map((r) => r.data);
      return importApi.commit(rowsToImport, file!.name);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setStep(2);
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast(`Import complete — ${res.data.successRows} records added`, "success");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast(msg || "Import failed — please try again", "error");
      console.error("[Import commit error]", e);
    },
  });

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
    maxSize: 52_428_800,
  });

  function reset() {
    setStep(0);
    setFile(null);
    setPreview(null);
    setResult(null);
    setPreviewPage(1);
  }

  const filteredRows = preview?.rows.filter(
    (r) => filterStatus === "all" || r.status === filterStatus
  ) ?? [];
  const pagedRows = filteredRows.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );

  // Import history
  const { data: batches } = useQuery({
    queryKey: ["import-batches"],
    queryFn: async () => (await importApi.batches({ page: 1, limit: 5 })).data,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="XLSX Import Wizard"
        subtitle="Import reservist records from Excel spreadsheets"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const res = await systemApi.downloadTemplate();
                const url = URL.createObjectURL(res.data);
                const a = document.createElement("a");
                a.href = url; a.download = "H12RCDG_Import_Template.xlsx"; a.click();
                URL.revokeObjectURL(url);
                toast("Template downloaded", "success");
              } catch { toast("Download failed", "error"); }
            }}>
              <FileSpreadsheet size={12} /> Download Template
            </Button>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw size={13} /> Start Over
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                i === step ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" :
                i < step ? "text-green-400" : "text-[#3d5470]"
              )}>
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  i === step ? "bg-blue-600 text-white" :
                  i < step ? "bg-green-600 text-white" : "bg-[#1e2d45] text-[#5a7499]"
                )}>
                  {i < step ? "✓" : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-[#2d4160] mx-1" />}
            </div>
          ))}
        </div>

        {/* ── STEP 0: Upload ── */}
        {step === 0 && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
                isDragActive
                  ? "border-blue-500 bg-blue-500/10"
                  : file
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-[#1e2d45] hover:border-[#2d4160] hover:bg-[#111c2d]"
              )}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet
                size={40}
                className={cn("mx-auto mb-4", file ? "text-green-400" : "text-[#2d4160]")}
              />
              {file ? (
                <>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-[#5a7499] text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace</p>
                </>
              ) : (
                <>
                  <p className="text-white font-medium">Drop your XLSX file here</p>
                  <p className="text-[#5a7499] text-sm mt-1">or click to browse · Max 50 MB · .xlsx / .xls</p>
                </>
              )}
            </div>

            <div className="bg-[#0d1520] border border-[#1e2d45] rounded-lg p-4 text-xs text-[#5a7499] space-y-1">
              <p className="text-[#8099b8] font-medium mb-2">Expected column headers in your file:</p>
              <div className="grid grid-cols-3 gap-1 font-mono">
                {["AFPSN", "RankCode", "LastName", "FirstName", "MiddleName", "Sex", "DateBirth",
                  "Coy", "Platoon", "SquadTeamSection", "DesignationCode", "ReservistStatus",
                  "MobileTelNo", "HomeAddress", "DateCommission"].map((col) => (
                  <span key={col} className="bg-[#111c2d] px-2 py-0.5 rounded">{col}</span>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!file}
              loading={previewMutation.isPending}
              onClick={() => file && previewMutation.mutate(file)}
            >
              <Upload size={16} /> {previewMutation.isPending ? "Analyzing file..." : "Validate & Preview"}
            </Button>

            {/* Import history */}
            {batches?.data?.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <History size={14} className="text-[#5a7499]" />
                  <CardTitle>Recent Imports</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[#1a2540]/50">
                    {batches.data.map((b: { id: number; filename: string; successRows: number; errorRows: number; dupRows: number; createdAt: string; uploadedBy: { fullName: string } }) => (
                      <div key={b.id} className="px-6 py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="text-white truncate max-w-[200px]">{b.filename}</p>
                          <p className="text-[#5a7499] text-xs">{b.uploadedBy.fullName} · {formatDateTime(b.createdAt)}</p>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-400">✓ {b.successRows}</span>
                          {b.dupRows > 0 && <span className="text-orange-400">⚠ {b.dupRows} dup</span>}
                          {b.errorRows > 0 && <span className="text-red-400">✗ {b.errorRows}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── STEP 1: Preview & Validate ── */}
        {step === 1 && preview && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Rows", value: preview.summary.total, color: "text-white" },
                { label: "Ready to Import", value: preview.summary.ok, color: "text-green-400" },
                { label: "Warnings (duplicates)", value: preview.summary.warnings, color: "text-orange-400" },
                { label: "Errors (will skip)", value: preview.summary.errors, color: "text-red-400" },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <p className="text-[#5a7499] text-xs mb-1">{s.label}</p>
                  <p className={cn("text-2xl font-bold", s.color)}>{s.value.toLocaleString()}</p>
                </Card>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "ok", "warning", "error"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilterStatus(f); setPreviewPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    filterStatus === f
                      ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                      : "border-[#1e2d45] text-[#5a7499] hover:text-white"
                  )}
                >
                  {f === "all" ? `All (${preview.summary.total})` :
                   f === "ok" ? `✓ Clean (${preview.summary.ok})` :
                   f === "warning" ? `⚠ Warning (${preview.summary.warnings})` :
                   `✗ Errors (${preview.summary.errors})`}
                </button>
              ))}
            </div>

            {/* Preview table */}
            <Card className="overflow-hidden">
              <Table>
                <thead>
                  <tr>
                    <Th>Row</Th>
                    <Th>Status</Th>
                    <Th>AFPSN</Th>
                    <Th>Rank</Th>
                    <Th>Name</Th>
                    <Th>Company</Th>
                    <Th>Status/Sex</Th>
                    <Th>Issues</Th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row: ImportPreviewRow) => (
                    <Tr key={row.rowIndex}
                      className={cn(
                        row.status === "error" && "bg-red-500/5",
                        row.status === "warning" && "bg-orange-500/5"
                      )}
                    >
                      <Td className="text-[#5a7499] text-xs w-12">{row.rowIndex}</Td>
                      <Td className="w-8">
                        {row.status === "ok" && <CheckCircle size={14} className="text-green-400" />}
                        {row.status === "warning" && <AlertTriangle size={14} className="text-orange-400" />}
                        {row.status === "error" && <XCircle size={14} className="text-red-400" />}
                      </Td>
                      <Td className="font-mono text-xs">{String(row.data.afpsn ?? "")}</Td>
                      <Td className="text-xs">{String(row.data.rankCode ?? "")}</Td>
                      <Td>
                        <span className="text-white text-sm">
                          {[row.data.lastName, row.data.firstName].filter(Boolean).join(", ")}
                        </span>
                      </Td>
                      <Td className="text-xs">{String(row.data.company ?? "—")}</Td>
                      <Td>
                        <div className="flex gap-1">
                          {row.data.reservistStatus && (
                            <Badge className={cn("text-xs",
                              row.data.reservistStatus === "READY" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            )}>
                              {String(row.data.reservistStatus)}
                            </Badge>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-0.5">
                          {row.errors.map((e, i) => (
                            <p key={i} className="text-red-400 text-xs">{e}</p>
                          ))}
                          {row.isDuplicateInDb && (
                            <p className="text-orange-400 text-xs">⚠ AFPSN exists in database</p>
                          )}
                          {row.isDuplicateInFile && (
                            <p className="text-orange-400 text-xs">⚠ Duplicate within this file</p>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {filteredRows.length > PREVIEW_PAGE_SIZE && (
                <Pagination
                  page={previewPage}
                  totalPages={Math.ceil(filteredRows.length / PREVIEW_PAGE_SIZE)}
                  total={filteredRows.length}
                  limit={PREVIEW_PAGE_SIZE}
                  onPageChange={setPreviewPage}
                />
              )}
            </Card>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button
                onClick={() => commitMutation.mutate()}
                loading={commitMutation.isPending}
                disabled={preview.summary.ok === 0 && preview.summary.warnings === 0}
              >
                Import {(preview.summary.ok + preview.summary.warnings).toLocaleString()} Records →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Result ── */}
        {step === 2 && result && (
          <div className="max-w-lg mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Import Complete</h2>
              <p className="text-[#5a7499]">Batch #{result.batchId}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-green-400 text-2xl font-bold">{result.successRows.toLocaleString()}</p>
                <p className="text-[#5a7499] text-xs mt-1">Records Added</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-orange-400 text-2xl font-bold">{result.dupRows.toLocaleString()}</p>
                <p className="text-[#5a7499] text-xs mt-1">Duplicates Flagged</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-red-400 text-2xl font-bold">{result.errorRows.toLocaleString()}</p>
                <p className="text-[#5a7499] text-xs mt-1">Rows Skipped</p>
              </Card>
            </div>

            {result.dupRows > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 text-sm text-orange-300">
                <AlertTriangle size={14} className="inline mr-2" />
                {result.dupRows} records were flagged as duplicate AFPSNs. Visit the <strong>Deduplication</strong> module to resolve them.
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}><RotateCcw size={13} /> Import Another</Button>
              <Button onClick={() => window.location.href = "/dedup"}>Go to Deduplication →</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
