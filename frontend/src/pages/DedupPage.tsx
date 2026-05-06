// src/pages/DedupPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GitMerge, AlertTriangle, CheckCircle, Flag, ChevronRight, Zap } from "lucide-react";
import { dedupApi } from "../lib/api";
import {
  Card, CardContent, Badge, Table, Th, Td, Tr, TableSkeleton,
  PageHeader, Pagination, EmptyState, StatsCard, Tabs, Button, ConfirmDialog, toast,
} from "../components/ui/index";
import { formatDateTime } from "../lib/utils";
import type { DedupGroup } from "../types";

const STATUS_BADGE: Record<string, "amber"|"green"|"blue"|"red"> = {
  PENDING:"amber", RESOLVED:"green", MERGED:"blue", FLAGGED:"red",
};

export function DedupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("PENDING");
  const [showResolveAll, setShowResolveAll] = useState(false);

  const { data: stats } = useQuery({ queryKey:["dedup-stats"], queryFn: async()=>(await dedupApi.stats()).data, staleTime: 30_000, refetchInterval:60_000 });
  const { data, isLoading } = useQuery<{ data: DedupGroup[]; meta: any }>({
    queryKey: ["dedup", page, status],
    queryFn: async () => (await dedupApi.list({ page, limit: 25, status })).data,
    staleTime: 30_000,
    placeholderData: p => p,
  });

  const resolveAllMut = useMutation({
    mutationFn: () => dedupApi.resolveAll(),
    onSuccess: (res) => {
      toast(`Resolved ${res.data.resolved} duplicate group(s)`, "success");
      queryClient.invalidateQueries({ queryKey: ["dedup"] });
      queryClient.invalidateQueries({ queryKey: ["dedup-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowResolveAll(false);
    },
    onError: () => toast("Failed to resolve all duplicates", "error"),
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Deduplication"
        subtitle="Identify and resolve duplicate AFPSN records"
        actions={
          stats && stats.pending > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setShowResolveAll(true)}>
              <Zap size={12}/> Resolve All
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={showResolveAll}
        title="Resolve All Pending Duplicates"
        description={`This will auto-resolve ${stats?.pending ?? 0} pending group(s) by keeping the oldest record in each group and archiving the rest. This action cannot be easily undone.`}
        confirmLabel="Resolve All"
        destructive
        loading={resolveAllMut.isPending}
        onConfirm={() => resolveAllMut.mutate()}
        onCancel={() => setShowResolveAll(false)}
      />

      <div className="p-5 space-y-4 flex-1 overflow-auto">
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            <StatsCard title="Pending" value={stats.pending} icon={<AlertTriangle size={14}/>} />
            <StatsCard title="Resolved" value={stats.resolved} icon={<CheckCircle size={14}/>} />
            <StatsCard title="Merged" value={stats.merged} icon={<GitMerge size={14}/>} />
            <StatsCard title="Flagged" value={stats.flagged} icon={<Flag size={14}/>} />
          </div>
        )}

        <Card className="flex flex-col overflow-hidden">
          <div className="border-b border-[rgb(var(--border))]">
            <Tabs
              value={status}
              onChange={s => { setStatus(s); setPage(1); }}
              tabs={[
                { value:"PENDING",  label:"Pending",  count:stats?.pending  },
                { value:"RESOLVED", label:"Resolved", count:stats?.resolved },
                { value:"MERGED",   label:"Merged",   count:stats?.merged   },
                { value:"FLAGGED",  label:"Flagged",  count:stats?.flagged  },
              ]}
              className="px-4"
            />
          </div>

          {isLoading ? <TableSkeleton rows={6} cols={4} /> :
           !data?.data.length ? (
            <EmptyState icon={<CheckCircle size={36} />}
              title={status==="PENDING" ? "No pending duplicates" : `No ${status.toLowerCase()} groups`}
              description={status==="PENDING" ? "All duplicate AFPSNs have been resolved." : ""} />
          ) : (
            <>
              <Table>
                <thead><tr>
                  <Th>AFPSN</Th><Th>Records</Th><Th>Status</Th><Th>Detected</Th><Th>Resolution</Th><Th className="w-8"/>
                </tr></thead>
                <tbody>
                  {data.data.map(g => (
                    <Tr key={g.id} onClick={() => navigate(`/dedup/${g.id}`)}>
                      <Td className="font-mono text-xs font-semibold text-[rgb(var(--text-1))]">{g.afpsn}</Td>
                      <Td>
                        <div className="space-y-0.5">
                          {g.members.slice(0,2).map((m,i) => (
                            <p key={i} className="text-xs text-[rgb(var(--text-2))]">{m.rankCode} {m.lastName}, {m.firstName} · {m.company ?? "—"}</p>
                          ))}
                          {(g._count?.members??g.members.length) > 2 && (
                            <p className="text-[11px] text-[rgb(var(--text-3))]">+{(g._count?.members??g.members.length)-2} more</p>
                          )}
                        </div>
                      </Td>
                      <Td><Badge variant={STATUS_BADGE[g.status]}>{g.status}</Badge></Td>
                      <Td className="text-xs text-[rgb(var(--text-3))]">{formatDateTime(g.createdAt)}</Td>
                      <Td className="text-xs text-[rgb(var(--text-2))] max-w-[200px] truncate">{g.resolution ?? "—"}</Td>
                      <Td><ChevronRight size={13} className="text-[rgb(var(--text-3))]"/></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {data.meta && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} limit={data.meta.limit} onPageChange={setPage} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
