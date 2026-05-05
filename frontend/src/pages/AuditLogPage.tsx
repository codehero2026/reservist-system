// src/pages/AuditLogPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { auditApi } from "../lib/api";
import {
  Card, Table, Th, Td, Tr, TableSkeleton, PageHeader,
  Pagination, EmptyState, Select, Label, Badge,
} from "../components/ui/index";
import { formatDateTime } from "../lib/utils";
import type { AuditLog } from "../types";

const ACTION_BADGE: Record<string, { label: string; variant: "green"|"blue"|"red"|"amber"|"default"|"outline" }> = {
  CREATE:      { label:"Create",      variant:"green"   },
  UPDATE:      { label:"Update",      variant:"blue"    },
  DELETE:      { label:"Delete",      variant:"red"     },
  IMPORT:      { label:"Import",      variant:"blue"    },
  EXPORT:      { label:"Export",      variant:"outline" },
  DEDUP_MERGE: { label:"Dedup Merge", variant:"amber"   },
  DEDUP_FLAG:  { label:"Dedup Flag",  variant:"amber"   },
  LOGIN:       { label:"Login",       variant:"default" },
  LOGOUT:      { label:"Logout",      variant:"default" },
};

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery<{ data: AuditLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ["audit", page, action],
    queryFn: async () => {
      const p: Record<string, string|number> = { page, limit: 30 };
      if (action) p.action = action;
      return (await auditApi.list(p)).data;
    },
    placeholderData: p => p,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Audit Log" subtitle="Complete history of all system actions" />

      <div className="flex items-center gap-4 px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-2)/0.5)]">
        <div className="w-48">
          <Label className="text-[10px]">Filter by action</Label>
          <Select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
            placeholder="All actions"
            options={Object.entries(ACTION_BADGE).map(([v,{label}]) => ({ value:v, label }))} />
        </div>
        {data && <span className="text-xs text-[rgb(var(--text-3))] ml-auto">{data.meta.total.toLocaleString()} entries</span>}
      </div>

      <div className="flex-1 overflow-auto">
        <Card className="rounded-none border-x-0 border-b-0 h-full flex flex-col">
          {isLoading ? <TableSkeleton rows={10} cols={5} /> :
           !data?.data.length ? <EmptyState icon={<ClipboardList size={36} />} title="No audit logs found" /> : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Timestamp</Th>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Table</Th>
                    <Th>Record</Th>
                    <Th>Notes</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(log => {
                    const ab = ACTION_BADGE[log.action] ?? { label: log.action, variant: "default" as const };
                    return (
                      <Tr key={log.id}>
                        <Td className="text-xs text-[rgb(var(--text-3))] whitespace-nowrap font-mono">{formatDateTime(log.createdAt)}</Td>
                        <Td><Badge variant={ab.variant}>{ab.label}</Badge></Td>
                        <Td>
                          <div className="text-xs font-medium text-[rgb(var(--text-1))]">{log.user.fullName}</div>
                          <div className="text-[11px] text-[rgb(var(--text-3))]">{log.user.role.replace("_"," ")}</div>
                        </Td>
                        <Td className="text-xs text-[rgb(var(--text-2))] font-mono">{log.tableName ?? "—"}</Td>
                        <Td className="text-xs font-mono text-[rgb(var(--text-3))]">{log.recordId ?? "—"}</Td>
                        <Td className="text-xs text-[rgb(var(--text-2))] max-w-[280px] truncate">{log.notes ?? "—"}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="mt-auto">
                <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit} onPageChange={setPage} />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
