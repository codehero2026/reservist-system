// src/pages/TrashPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Search, AlertTriangle } from "lucide-react";
import { trashApi } from "../lib/api";
import {
  Button, PageHeader, Table, Th, Td, Tr, Pagination,
  SearchInput, EmptyState, Spinner, ConfirmDialog, Badge,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { fullName, formatDateTime } from "../lib/utils";
import type { Reservist, PaginatedResponse } from "../types";

export function TrashPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Reservist | null>(null);
  const [restoreAllConfirm, setRestoreAllConfirm] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Reservist>>({
    queryKey: ["trash", page, search],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (search) params.search = search;
      return (await trashApi.list(params)).data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => trashApi.restore(id),
    onSuccess: () => {
      toast("Record restored", "success");
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["personnel"] });
      setRestoreTarget(null);
    },
    onError: () => toast("Restore failed", "error"),
  });

  const restoreAllMutation = useMutation({
    mutationFn: () => trashApi.restoreAll(),
    onSuccess: (res) => {
      toast(res.data.message, "success");
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["personnel"] });
      setRestoreAllConfirm(false);
    },
    onError: () => toast("Restore all failed", "error"),
  });

  const records = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="flex flex-col h-full in">
      <PageHeader
        title="Trash"
        subtitle={`${total} deleted record${total !== 1 ? "s" : ""}`}
        actions={
          total > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setRestoreAllConfirm(true)}>
              <RotateCcw size={12} /> Restore All
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(var(--card))] border-b border-[rgb(var(--border))]">
        <SearchInput
          className="w-60"
          placeholder="Search deleted records..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          onClear={() => setSearch("")}
        />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-ink3">
          <AlertTriangle size={12} />
          <span>Soft-deleted records are preserved and can be restored.</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[rgb(var(--card))]">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Trash2 size={18} />}
            title="Trash is empty"
            description="No deleted records found. Deleted personnel will appear here."
          />
        ) : (
          <div className="flex flex-col" style={{ minHeight: "100%" }}>
            <Table>
              <thead>
                <tr>
                  <Th>AFPSN</Th>
                  <Th>Name</Th>
                  <Th>Company</Th>
                  <Th>Status</Th>
                  <Th>Mobile</Th>
                  <Th>Deleted At</Th>
                  <Th className="w-24 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <Tr key={r.id}>
                    <Td className="font-mono text-xs">{r.afpsn}</Td>
                    <Td>
                      <p className="text-xs font-medium text-ink">{fullName(r)}</p>
                      <p className="text-2xs text-ink3">{r.rankCode} · {r.sex === "M" ? "Male" : "Female"}</p>
                    </Td>
                    <Td className="text-xs">{r.company ?? "—"}</Td>
                    <Td><Badge variant={r.reservistStatus === "READY" ? "green" : r.reservistStatus === "STANDBY" ? "amber" : "default"}>{r.reservistStatus}</Badge></Td>
                    <Td className="font-mono text-xs text-ink3">{r.mobileTelNo ?? "—"}</Td>
                    <Td className="text-xs text-ink3">{formatDateTime(r.updatedAt)}</Td>
                    <Td className="text-right">
                      <Button variant="outline" size="xs" onClick={() => setRestoreTarget(r)}>
                        <RotateCcw size={11} /> Restore
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            {data?.meta && (
              <div className="mt-auto">
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  total={data.meta.total}
                  limit={data.meta.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!restoreTarget}
        title="Restore Record"
        description={restoreTarget ? `Restore ${fullName(restoreTarget)} (${restoreTarget.afpsn}) back to the personnel registry?` : ""}
        confirmLabel="Restore"
        onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}
        onCancel={() => setRestoreTarget(null)}
        loading={restoreMutation.isPending}
      />

      <ConfirmDialog
        open={restoreAllConfirm}
        title="Restore All Records"
        description={`Restore all ${total} deleted records back to the personnel registry? This will make all soft-deleted records active again.`}
        confirmLabel="Restore All"
        onConfirm={() => restoreAllMutation.mutate()}
        onCancel={() => setRestoreAllConfirm(false)}
        loading={restoreAllMutation.isPending}
      />
    </div>
  );
}
