// src/pages/DedupDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, GitMerge, Flag, AlertTriangle } from "lucide-react";
import { dedupApi } from "../lib/api";
import {
  Button, Badge, Card, CardHeader, CardTitle, CardContent,
  Spinner, PageHeader, ConfirmDialog,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { cn, DEDUP_COLORS, formatDate } from "../lib/utils";
import type { DedupGroup, Reservist } from "../types";

const COMPARE_FIELDS: { key: keyof Reservist; label: string }[] = [
  { key: "afpsn", label: "AFPSN" },
  { key: "rankCode", label: "Rank" },
  { key: "lastName", label: "Last Name" },
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "sex", label: "Sex" },
  { key: "dateBirth", label: "Date of Birth" },
  { key: "placeBirth", label: "Place of Birth" },
  { key: "bloodType", label: "Blood Type" },
  { key: "maritalStatus", label: "Marital Status" },
  { key: "homeAddress", label: "Home Address" },
  { key: "mobileTelNo", label: "Mobile No." },
  { key: "brSvcCode", label: "Branch of Service" },
  { key: "svcAfos", label: "AFOS" },
  { key: "dateCommission", label: "Date Commission" },
  { key: "reservistStatus", label: "Status" },
  { key: "company", label: "Company" },
  { key: "platoon", label: "Platoon" },
  { key: "squadTeamSection", label: "Squad/Section" },
  { key: "designationCode", label: "Designation" },
];

export function DedupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keepTarget, setKeepTarget] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [flagNotes, setFlagNotes] = useState("");
  const [modal, setModal] = useState<"keep" | "merge" | "flag" | null>(null);

  const { data, isLoading } = useQuery<{ data: DedupGroup }>({
    queryKey: ["dedup", id],
    queryFn: async () => (await dedupApi.get(Number(id))).data,
    enabled: !!id,
  });

  const keepMutation = useMutation({
    mutationFn: () => dedupApi.keep(Number(id), keepTarget!, `Kept record #${keepTarget}`),
    onSuccess: () => {
      toast("Resolved — kept record, archived others", "success");
      qc.invalidateQueries({ queryKey: ["dedup"] });
      navigate("/dedup");
    },
    onError: () => toast("Action failed", "error"),
  });

  const mergeMutation = useMutation({
    mutationFn: () => {
      const primary = group?.members.find((m) => m.id === mergeTarget);
      return dedupApi.merge(Number(id), mergeTarget!, primary as unknown, `Merged into #${mergeTarget}`);
    },
    onSuccess: () => {
      toast("Records merged successfully", "success");
      qc.invalidateQueries({ queryKey: ["dedup"] });
      navigate("/dedup");
    },
    onError: () => toast("Merge failed", "error"),
  });

  const flagMutation = useMutation({
    mutationFn: () => dedupApi.flag(Number(id), flagNotes),
    onSuccess: () => {
      toast("Group flagged for supervisor review", "info");
      qc.invalidateQueries({ queryKey: ["dedup"] });
      navigate("/dedup");
    },
    onError: () => toast("Flag failed", "error"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Spinner /></div>;

  const group = data?.data;
  if (!group) return <div className="p-8 text-[#5a7499]">Group not found.</div>;

  const members = group.members as Partial<Reservist>[];
  const isPending = group.status === "PENDING";

  // Detect fields that differ between members
  function fieldsDiffer(key: keyof Reservist): boolean {
    const vals = members.map((m) => String(m[key] ?? "").toLowerCase().trim());
    return new Set(vals).size > 1;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={`Dedup Group #${group.id}`}
        subtitle={`AFPSN: ${group.afpsn} · ${members.length} conflicting records`}
        actions={
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setModal("flag")}>
                  <Flag size={13} /> Flag for Review
                </Button>
              </>
            )}
            <Badge className={cn(DEDUP_COLORS[group.status])}>{group.status}</Badge>
            <Button size="sm" variant="ghost" onClick={() => navigate("/dedup")}>
              <ArrowLeft size={13} /> Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {!isPending && group.resolution && (
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
            <CheckCircle size={14} />
            Resolution: {group.resolution}
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-300">
            <AlertTriangle size={14} />
            Choose an action: <strong>Keep One</strong> to keep a single record and archive the rest, or <strong>Merge</strong> to combine fields into one record.
          </div>
        )}

        {/* Side-by-side comparison */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs text-[#5a7499] bg-[#0d1622] border-b border-[#1e2d45] w-36">Field</th>
                {members.map((m, i) => (
                  <th key={i} className="px-4 py-3 bg-[#0d1622] border-b border-[#1e2d45] min-w-[200px]">
                    <div className="flex flex-col items-start gap-2">
                      <span className="text-white font-semibold text-xs">
                        Record #{m.id} · {m.rankCode} {m.lastName}
                      </span>
                      <span className="text-[#5a7499] text-xs">{m.company ?? "No company"}</span>
                      {isPending && (
                        <div className="flex gap-1 mt-1">
                          <Button
                            size="sm"
                            variant={keepTarget === m.id ? "primary" : "outline"}
                            onClick={() => { setKeepTarget(m.id!); setModal("keep"); }}
                          >
                            <CheckCircle size={11} /> Keep This
                          </Button>
                          <Button
                            size="sm"
                            variant={mergeTarget === m.id ? "primary" : "ghost"}
                            onClick={() => { setMergeTarget(m.id!); setModal("merge"); }}
                          >
                            <GitMerge size={11} /> Merge Into
                          </Button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_FIELDS.map(({ key, label }) => {
                const differs = fieldsDiffer(key);
                return (
                  <tr key={key} className={cn("border-b border-[#1a2540]/40", differs && "bg-orange-500/5")}>
                    <td className="px-4 py-2.5 text-xs text-[#5a7499] font-medium whitespace-nowrap">
                      {differs && <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-2 mb-0.5" />}
                      {label}
                    </td>
                    {members.map((m, i) => {
                      let val = m[key];
                      if (["dateBirth", "dateCommission", "dateLastPromotion"].includes(key) && val) {
                        val = formatDate(val as string);
                      }
                      return (
                        <td key={i} className={cn("px-4 py-2.5 text-sm", differs ? "text-orange-200" : "text-[#8099b8]")}>
                          {String(val ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-[#5a7499]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400" />
          Fields highlighted in orange differ between records
        </div>
      </div>

      {/* Keep confirm */}
      <ConfirmDialog
        open={modal === "keep" && keepTarget !== null}
        title="Keep This Record"
        description={`Record #${keepTarget} will be kept as the authoritative record. All other records in this group (${members.length - 1} records) will be soft-deleted and archived.`}
        onConfirm={() => { keepMutation.mutate(); setModal(null); }}
        onCancel={() => { setModal(null); setKeepTarget(null); }}
        loading={keepMutation.isPending}
      />

      {/* Merge confirm */}
      <ConfirmDialog
        open={modal === "merge" && mergeTarget !== null}
        title="Merge Into This Record"
        description={`Record #${mergeTarget} will be kept as the primary record. All other records will be archived. Note: This does not automatically merge field values — edit the primary record afterward if needed.`}
        onConfirm={() => { mergeMutation.mutate(); setModal(null); }}
        onCancel={() => { setModal(null); setMergeTarget(null); }}
        loading={mergeMutation.isPending}
      />

      {/* Flag dialog */}
      {modal === "flag" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-[#111c2d] border border-[#1e2d45] rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-white font-semibold mb-2">Flag for Supervisor Review</h2>
            <p className="text-[#5a7499] text-sm mb-4">Add a note explaining why this group needs manual review by a supervisor.</p>
            <textarea
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              placeholder="e.g. Unsure if these are the same person — same AFPSN but different birthdays..."
              className="w-full bg-[#0f1623] border border-[#1e2d45] rounded-lg p-3 text-white text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { flagMutation.mutate(); setModal(null); }} loading={flagMutation.isPending}>
                <Flag size={13} /> Flag Group
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
