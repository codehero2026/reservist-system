// src/pages/PersonnelDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, AlertTriangle, UserCircle2 } from "lucide-react";
import { personnelApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { Button, SectionCard, DetailGrid, DetailField, LoadingPage, PageHeader, ConfirmDialog, StatusBadge, Badge, Divider } from "../components/ui/index";
import { toast } from "../components/ui/index";
import { canEdit, canDelete, fullName, formatDate } from "../lib/utils";
import { useState } from "react";
import type { Reservist } from "../types";

export function PersonnelDetailPage() {
  const { id } = useParams<{id:string}>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [del, setDel] = useState(false);

  const { data, isLoading } = useQuery<{data:Reservist}>({
    queryKey: ["personnel", id],
    queryFn: async () => (await personnelApi.get(Number(id))).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => personnelApi.delete(Number(id)),
    onSuccess: () => {
      toast("Reservist deleted", "success");
      qc.invalidateQueries({ queryKey: ["personnel"] });
      navigate("/personnel");
    },
    onError: () => toast("Delete failed", "error"),
  });

  if (isLoading) return <LoadingPage/>;
  const r = data?.data;
  if (!r) return <div className="p-8 text-sm text-[rgb(var(--ink-3))]">Record not found.</div>;

  return (
    <div className="in flex flex-col h-full">
      <PageHeader
        title={fullName(r)}
        subtitle={`${r.rankCode} · ${r.afpsn}`}
        actions={
          <div className="flex items-center gap-2">
            {r.isDuplicate && <Badge variant="amber" dot>Duplicate AFPSN</Badge>}
            <StatusBadge status={r.reservistStatus}/>
            <Divider className="h-4 w-px my-0 mx-1 border-l border-[rgb(var(--border))]"/>
            {canEdit(user?.role ?? "") && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/personnel/${id}/edit`)}>
                <Pencil size={12}/> Edit
              </Button>
            )}
            {canDelete(user?.role ?? "") && (
              <Button size="sm" variant="ghost" onClick={() => setDel(true)}
                className="text-[rgb(var(--red))] hover:bg-[rgb(var(--red-bg))]">
                <Trash2 size={12}/>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft size={12}/> Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-5 space-y-4 max-w-[1100px]">
        {/* Identity */}
        <div className="c-card px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-[rgb(var(--blue-light))] flex items-center justify-center shrink-0">
            <UserCircle2 size={22} className="text-[rgb(var(--blue))]"/>
          </div>
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--ink))]">{fullName(r)}</p>
            <p className="text-xs text-[rgb(var(--ink-3))] mt-0.5">
              {r.rankCode} · {r.designationCode ?? "No designation"} · {r.company ?? "No company"} · {r.sex === "M" ? "Male" : "Female"}
            </p>
          </div>
        </div>

        <SectionCard title="Personal Information">
          <DetailGrid>
            <DetailField label="AFPSN"          value={r.afpsn} mono/>
            <DetailField label="Rank"            value={r.rankCode}/>
            <DetailField label="Sex"             value={r.sex==="M"?"Male":"Female"}/>
            <DetailField label="Date of Birth"   value={formatDate(r.dateBirth)}/>
            <DetailField label="Place of Birth"  value={r.placeBirth}/>
            <DetailField label="Blood Type"      value={r.bloodType}/>
            <DetailField label="Religion Code"   value={r.religionCode}/>
            <DetailField label="Marital Status"  value={r.maritalStatus}/>
            <DetailField label="TIN"             value={r.tin} mono/>
          </DetailGrid>
        </SectionCard>

        <SectionCard title="Contact">
          <DetailGrid>
            <DetailField label="Home Address"    value={r.homeAddress}/>
            <DetailField label="Province Code"   value={r.townProvinceCode}/>
            <DetailField label="Telephone"       value={r.telephoneNo}/>
            <DetailField label="Mobile"          value={r.mobileTelNo}/>
            <DetailField label="Office Address"  value={r.officeAddress}/>
            <DetailField label="Office Tel."     value={r.officeTelNo}/>
          </DetailGrid>
        </SectionCard>

        <SectionCard title="Military Service">
          <DetailGrid>
            <DetailField label="Branch"          value={r.brSvcCode}/>
            <DetailField label="AFOS"            value={r.svcAfos}/>
            <DetailField label="Commission Source" value={r.sourceCommissionCode}/>
            <DetailField label="Date Commissioned" value={formatDate(r.dateCommission)}/>
            <DetailField label="Authority"       value={r.commissionAuthority}/>
            <DetailField label="Initial Rank"    value={r.initialRank}/>
            <DetailField label="Last Promoted"   value={formatDate(r.dateLastPromotion)}/>
            <DetailField label="Promo Authority" value={r.promotionAuthority}/>
          </DetailGrid>
        </SectionCard>

        <SectionCard title="Unit Assignment">
          <DetailGrid>
            <DetailField label="Status"          value={r.reservistStatus}/>
            <DetailField label="Mob. Code"       value={r.mobilizationCode}/>
            <DetailField label="Designation"     value={r.designationCode}/>
            <DetailField label="Squad / Section" value={r.squadTeamSection}/>
            <DetailField label="Platoon"         value={r.platoon}/>
            <DetailField label="Company"         value={r.company}/>
            <DetailField label="Battalion"       value={r.bnCode}/>
            <DetailField label="Occupation Code" value={r.presentOccupationCode}/>
          </DetailGrid>
        </SectionCard>

        <SectionCard title="Uniform Sizes">
          <DetailGrid cols={4}>
            <DetailField label="Boots" value={r.sizeBoots}/>
            <DetailField label="Cap"   value={r.sizeCaps}/>
            <DetailField label="BDA"   value={r.sizeBda}/>
          </DetailGrid>
        </SectionCard>

        <div className="c-card px-5 py-3.5 bg-[rgb(var(--subtle))]">
          <div className="flex gap-8 text-2xs text-[rgb(var(--ink-3))]">
            <span>Created {formatDate(r.createdAt)}</span>
            <span>Updated {formatDate(r.updatedAt)}</span>
            <span>Source: {r.sourceSheet ?? "Manual"}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={del} title="Delete Reservist"
        description={`Are you sure you want to delete ${fullName(r)}? The record will be soft-deleted and can be restored by an administrator.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDel(false)}
        loading={deleteMutation.isPending} destructive
      />
    </div>
  );
}
