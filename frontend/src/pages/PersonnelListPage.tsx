// src/pages/PersonnelListPage.tsx
// Personnel registry — table + inline modal add/edit (no full-page navigation for CRUD)
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, SlidersHorizontal, X, AlertTriangle,
  Download, Users, MoreHorizontal, Eye, Pencil, Trash2,
  ChevronDown, FileText, FileSpreadsheet, File,
  CheckCircle2, Upload,
} from "lucide-react";
import { personnelApi, reportsApi, batchApi } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import {
  Button, Table, Th, Td, Tr, Pagination,
  LoadingPage, EmptyState, PageHeader, SearchInput,
  Select, Label, StatusBadge, Modal, ConfirmDialog,
  FormField, Input, Skeleton, Divider,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { cn, canEdit, canDelete, fullName, formatDate } from "../lib/utils";
import type { Reservist, PaginatedResponse } from "../types";
import * as XLSX from "xlsx";

// ─── Zod schema for add/edit form ────────────────────────────────────
const schema = z.object({
  afpsn:              z.string().min(1, "AFPSN is required"),
  rankCode:           z.string().min(1, "Rank is required"),
  lastName:           z.string().min(1, "Last name is required"),
  firstName:          z.string().min(1, "First name is required"),
  middleName:         z.string().optional(),
  sex:                z.enum(["M", "F"]),
  reservistStatus:    z.enum(["READY", "STANDBY", "RETIRED", "DISCHARGED"]).default("READY"),
  company:            z.string().optional(),
  platoon:            z.string().optional(),
  squadTeamSection:   z.string().optional(),
  designationCode:    z.string().optional(),
  mobileTelNo:        z.string().optional(),
  homeAddress:        z.string().optional(),
  townProvinceCode:   z.string().optional(),
  dateBirth:          z.string().optional(),
  placeBirth:         z.string().optional(),
  bloodType:          z.string().optional(),
  maritalStatus:      z.enum(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"]).optional(),
  brSvcCode:          z.string().optional(),
  svcAfos:            z.string().optional(),
  dateCommission:     z.string().optional(),
  commissionAuthority:z.string().optional(),
  initialRank:        z.string().optional(),
  dateLastPromotion:  z.string().optional(),
  mobilizationCode:   z.string().optional(),
  bnCode:             z.string().optional(),
  sizeBoots:          z.string().optional(),
  sizeCaps:           z.string().optional(),
  sizeBda:            z.string().optional(),
  tin:                z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Reusable field row for the modal form ───────────────────────────
function F({
  label, name, register, error, type = "text", placeholder, required,
}: {
  label: string;
  name: keyof FormData;
  register: ReturnType<typeof useForm<FormData>>["register"];
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <FormField label={label} required={required} error={error}>
      <Input
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={cn(error && "border-[rgb(var(--red))]")}
      />
    </FormField>
  );
}

// ─── Export Modal ──────────────────────────────────────────────────
type ExportFormat = "XLSX" | "CSV" | "DOCX" | "PDF";

function ExportModal({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
}) {
  const [format, setFormat] = useState<ExportFormat>("XLSX");
  const [exporting, setExporting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [customLogo, setCustomLogo] = useState<File | null>(null);

  const formats: { id: ExportFormat; icon: any; label: string; ext: string }[] = [
    { id: "XLSX", icon: FileSpreadsheet, label: "Excel Spreadsheet", ext: "xlsx" },
    { id: "CSV",  icon: File,            label: "Comma Separated Values", ext: "csv" },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      // 1. Fetch live report data matching current filters
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await reportsApi.roster(params);
      const allRecords = res.data.data as Reservist[];

      if (!allRecords || allRecords.length === 0) {
        toast("No records match your filters to export", "error");
        setExporting(false);
        return;
      }

      const filename = `roster_h12rcdg_${new Date().toISOString().slice(0, 10)}`;
      const timestamp = new Date().toLocaleString("en-PH", { hour12: true });
      const filterSummary = Object.entries(filters)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`).join(", ") || "None";

      if (format === "XLSX" || format === "CSV") {
        const dataRows = allRecords.map(r => [
          r.afpsn, r.rankCode, fullName(r),
          r.company ?? "", r.reservistStatus, r.mobileTelNo ?? ""
        ]);
        const headerRow = ["AFPSN", "Rank", "Name", "Company", "Status", "Mobile"];
        
        const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Roster");

        if (format === "XLSX") {
          XLSX.writeFile(wb, `${filename}.xlsx`);
        } else {
          const csv = XLSX.utils.sheet_to_csv(ws);
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `${filename}.csv`; a.click();
          URL.revokeObjectURL(url);
        }
      }

      toast(`${format} export generated successfully`, "success");
      onClose();
    } catch {
      toast("Live data fetch or generation failed", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Personnel Repository"
      subtitle="Select format and customize export options"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => setIsConfirming(true)}>
            Confirm Export
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <Label className="mb-2 block">Choose File Format</Label>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  format === f.id
                    ? "border-[rgb(var(--blue))] bg-[rgb(var(--blue)/0.05)] ring-1 ring-[rgb(var(--blue))]"
                    : "border-[rgb(var(--border))] hover:bg-[rgb(var(--subtle))]"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  format === f.id ? "bg-[rgb(var(--blue))] text-white" : "bg-[rgb(var(--subtle))] text-[rgb(var(--ink-4))]"
                )}>
                  <f.icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--ink))]">{f.label}</p>
                  <p className="text-2xs text-[rgb(var(--ink-3))]">.{f.ext} file type</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Template/Logo (Custom Option) */}
        <div>
          <Label className="mb-1.5 block">Custom Export Template / Logo (Optional)</Label>
          <div
            onClick={() => document.getElementById("export-file")?.click()}
            className="border-2 border-dashed border-[rgb(var(--border))] rounded-xl p-4 text-center cursor-pointer hover:bg-[rgb(var(--subtle))] transition-colors"
          >
            <input
              id="export-file"
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCustomLogo(f);
              }}
            />
            {customLogo ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[rgb(var(--ink-2))] font-medium">
                <CheckCircle2 size={14} className="text-[rgb(var(--green))]" />
                {customLogo.name} ({(customLogo.size / 1024).toFixed(1)} KB)
              </div>
            ) : (
              <>
                <Upload size={18} className="mx-auto mb-2 text-[rgb(var(--ink-4))]" />
                <p className="text-2xs text-[rgb(var(--ink-3))]">Upload custom header logo or template (.png, .jpg, .docx)</p>
              </>
            )}
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-[rgb(var(--subtle))] rounded-lg p-3 text-2xs text-[rgb(var(--ink-3))] space-y-1">
          <div className="flex justify-between">
            <span>Repository Data Fetch:</span>
            <span className="font-semibold text-[rgb(var(--blue))]">Full filtered list</span>
          </div>
          <div className="flex justify-between">
            <span>Output format:</span>
            <span className="font-semibold">{format}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirming}
        title="Export Report"
        description={`Do you want to export this report as ${format}?`}
        confirmLabel="Yes, Export"
        onConfirm={() => {
          setIsConfirming(false);
          handleExport();
        }}
        onCancel={() => setIsConfirming(false)}
      />
    </Modal>
  );
}
function PersonnelModal({
  open,
  onClose,
  editRecord,
}: {
  open: boolean;
  onClose: () => void;
  editRecord?: Reservist | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!editRecord;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sex: "M", reservistStatus: "READY" },
  });

  // Populate form when editing
  useEffect(() => {
    if (editRecord) {
      reset({
        afpsn:              editRecord.afpsn,
        rankCode:           editRecord.rankCode,
        lastName:           editRecord.lastName,
        firstName:          editRecord.firstName,
        middleName:         editRecord.middleName ?? "",
        sex:                editRecord.sex,
        reservistStatus:    editRecord.reservistStatus,
        company:            editRecord.company ?? "",
        platoon:            editRecord.platoon ?? "",
        squadTeamSection:   editRecord.squadTeamSection ?? "",
        designationCode:    editRecord.designationCode ?? "",
        mobileTelNo:        editRecord.mobileTelNo ?? "",
        homeAddress:        editRecord.homeAddress ?? "",
        townProvinceCode:   editRecord.townProvinceCode ?? "",
        dateBirth:          editRecord.dateBirth?.slice(0, 10) ?? "",
        placeBirth:         editRecord.placeBirth ?? "",
        bloodType:          editRecord.bloodType ?? "",
        maritalStatus:      editRecord.maritalStatus ?? undefined,
        brSvcCode:          editRecord.brSvcCode ?? "",
        svcAfos:            editRecord.svcAfos ?? "",
        dateCommission:     editRecord.dateCommission?.slice(0, 10) ?? "",
        commissionAuthority:editRecord.commissionAuthority ?? "",
        initialRank:        editRecord.initialRank ?? "",
        dateLastPromotion:  editRecord.dateLastPromotion?.slice(0, 10) ?? "",
        mobilizationCode:   editRecord.mobilizationCode ?? "",
        bnCode:             editRecord.bnCode ?? "",
        sizeBoots:          editRecord.sizeBoots ?? "",
        sizeCaps:           editRecord.sizeCaps ?? "",
        sizeBda:            editRecord.sizeBda ?? "",
        tin:                editRecord.tin ?? "",
      });
    } else {
      reset({ sex: "M", reservistStatus: "READY" });
    }
  }, [editRecord, reset, open]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? personnelApi.update(editRecord!.id, data as Record<string, unknown>)
        : personnelApi.create(data as Record<string, unknown>),
    onSuccess: (res) => {
      const isDup = res.data?.isDuplicate;
      toast(
        isEdit
          ? "Record updated"
          : `Record created${isDup ? " — duplicate AFPSN flagged" : ""}`,
        isDup ? "info" : "success"
      );
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast(e?.response?.data?.error ?? "Save failed", "error");
    },
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${fullName(editRecord!)}` : "Add New Reservist"}
      subtitle={isEdit ? `AFPSN: ${editRecord!.afpsn}` : "Enter personnel details below"}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? "Save Changes" : "Create Record"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Section: Identity */}
        <div>
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-widest mb-3">
            Identity
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="AFPSN"      name="afpsn"     register={register} error={errors.afpsn?.message}     required placeholder="SK-R15-000261"/>
            <F label="Rank Code"  name="rankCode"  register={register} error={errors.rankCode?.message}  required placeholder="CPL"/>
            <div>
              <Label required>Sex</Label>
              <Select
                {...register("sex")}
                options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]}
              />
            </div>
            <F label="Last Name"  name="lastName"  register={register} error={errors.lastName?.message}  required/>
            <F label="First Name" name="firstName" register={register} error={errors.firstName?.message} required/>
            <F label="Middle Name" name="middleName" register={register}/>
          </div>
        </div>

        <Divider />

        {/* Section: Personal */}
        <div>
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-widest mb-3">
            Personal Information
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="Date of Birth"  name="dateBirth"  register={register} type="date"/>
            <F label="Place of Birth" name="placeBirth" register={register}/>
            <F label="Blood Type"     name="bloodType"  register={register} placeholder="A / B / O / AB"/>
            <div>
              <Label>Marital Status</Label>
              <Select
                {...register("maritalStatus")}
                placeholder="Select…"
                options={["SINGLE","MARRIED","WIDOWED","SEPARATED"].map(s => ({ value: s, label: s }))}
              />
            </div>
            <F label="TIN" name="tin" register={register} placeholder="xxx-xxx-xxx"/>
            <F label="Mobile No." name="mobileTelNo" register={register}/>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <F label="Home Address"     name="homeAddress"     register={register}/>
            <F label="Town / Province Code" name="townProvinceCode" register={register}/>
          </div>
        </div>

        <Divider />

        {/* Section: Military Service */}
        <div>
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-widest mb-3">
            Military Service
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <F label="Branch of Service" name="brSvcCode"          register={register} placeholder="PA"/>
            <F label="AFOS"              name="svcAfos"             register={register}/>
            <F label="Initial Rank"      name="initialRank"         register={register}/>
            <F label="Date Commissioned" name="dateCommission"      register={register} type="date"/>
            <F label="Date Last Promoted" name="dateLastPromotion"  register={register} type="date"/>
            <div className="sm:col-span-1">
              <F label="Commission Authority" name="commissionAuthority" register={register}/>
            </div>
          </div>
        </div>

        <Divider />

        {/* Section: Assignment */}
        <div>
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-widest mb-3">
            Unit Assignment
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label required>Reservist Status</Label>
              <Select
                {...register("reservistStatus")}
                options={["READY","STANDBY","RETIRED","DISCHARGED"].map(s => ({ value: s, label: s }))}
              />
            </div>
            <F label="Company"       name="company"          register={register} placeholder="ALPHA"/>
            <F label="Platoon"       name="platoon"          register={register}/>
            <F label="Squad / Section" name="squadTeamSection" register={register}/>
            <F label="Designation"   name="designationCode"  register={register} placeholder="RIFLEMAN"/>
            <F label="Mob. Code"     name="mobilizationCode" register={register}/>
            <F label="Battalion Code" name="bnCode"          register={register}/>
          </div>
        </div>

        <Divider />

        {/* Section: Uniform */}
        <div>
          <p className="text-2xs font-semibold text-[rgb(var(--ink-3))] uppercase tracking-widest mb-3">
            Uniform Sizes
          </p>
          <div className="grid grid-cols-3 gap-3">
            <F label="Boot Size" name="sizeBoots" register={register} placeholder="9 WIDE"/>
            <F label="Cap Size"  name="sizeCaps"  register={register} placeholder="56"/>
            <F label="BDA Size"  name="sizeBda"   register={register} placeholder="MEDIUM REGULAR"/>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Row action dropdown ──────────────────────────────────────────────
function RowMenu({
  record,
  onView,
  onEdit,
  onDelete,
  canEditRecord,
  canDeleteRecord,
}: {
  record: Reservist;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEditRecord: boolean;
  canDeleteRecord: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative" ref={r => { if (r) ref[1](r); }}>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreHorizontal size={14} />
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-lg shadow-md w-36 py-1 in"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
            className="w-full flex items-center gap-2 px-3 py-[7px] text-xs text-[rgb(var(--ink-2))] hover:bg-[rgb(var(--subtle))] hover:text-[rgb(var(--ink))] transition-colors"
          >
            <Eye size={12} /> View Profile
          </button>
          {canEditRecord && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3 py-[7px] text-xs text-[rgb(var(--ink-2))] hover:bg-[rgb(var(--subtle))] hover:text-[rgb(var(--ink))] transition-colors"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
          {canDeleteRecord && (
            <>
              <div className="my-1 border-t border-[rgb(var(--border-soft))]" />
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-[7px] text-xs text-[rgb(var(--red))] hover:bg-[rgb(var(--red-bg))] transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────
type Filters = {
  search: string; company: string; status: string;
  platoon: string; sex: string; rankCode: string; isDuplicate: string;
};
const DEFAULT_FILTERS: Filters = {
  search: "", company: "", status: "", platoon: "", sex: "", rankCode: "", isDuplicate: "",
};

// ─── Table skeleton rows ─────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="bg-[rgb(var(--card))]">
          {[80, 160, 80, 100, 90, 70, 100, 70].map((w, j) => (
            <td key={j} className="px-4 py-3 border-b border-[rgb(var(--border-soft))]">
              <Skeleton style={{ width: w, height: 12 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── PersonnelListPage ────────────────────────────────────────────────
export function PersonnelListPage() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const qc        = useQueryClient();
  const role      = user?.role ?? "";

  // Seed filters from URL query params (used by dashboard card links)
  const [searchParams] = useSearchParams();
  const initialFilters: Filters = {
    ...DEFAULT_FILTERS,
    status:      searchParams.get("status")      ?? "",
    sex:         searchParams.get("sex")         ?? "",
    isDuplicate: searchParams.get("isDuplicate") ?? "",
    company:     searchParams.get("company")     ?? "",
    search:      searchParams.get("search")      ?? "",
  };

  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState<Filters>(initialFilters);
  const [showFilters,setShowFilters]= useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editRecord, setEditRecord] = useState<Reservist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reservist | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchStatusModal, setBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState("READY");
  const [batchNotes, setBatchNotes] = useState("");

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<Reservist>>({
    queryKey: ["personnel", page, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      return (await personnelApi.list(params)).data;
    },
    placeholderData: (prev) => prev,
  });

  const { data: opts } = useQuery({
    queryKey: ["personnel-options"],
    queryFn: async () => (await personnelApi.options()).data,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => personnelApi.delete(id),
    onSuccess: () => {
      toast("Record deleted", "success");
      qc.invalidateQueries({ queryKey: ["personnel"] });
      setDeleteTarget(null);
    },
    onError: () => toast("Delete failed", "error"),
  });

  const batchMutation = useMutation({
    mutationFn: () => batchApi.updateStatus(Array.from(selectedIds), batchStatus, batchNotes || undefined),
    onSuccess: (res) => {
      toast(res.data.message, "success");
      qc.invalidateQueries({ queryKey: ["personnel"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setSelectedIds(new Set());
      setBatchStatusModal(false);
      setBatchNotes("");
    },
    onError: () => toast("Batch update failed", "error"),
  });

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (!data?.data) return;
    const allIds = data.data.map(r => r.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  }

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const clearFilters  = useCallback(() => { setFilters(DEFAULT_FILTERS); setPage(1); }, []);
  const setFilter     = (key: keyof Filters, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  function openAdd()  { setEditRecord(null);   setModalOpen(true); }
  function openEdit(r: Reservist) { setEditRecord(r); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditRecord(null); }

  const filterDefs = [
    { label: "Company",  key: "company"     as keyof Filters, opts: (opts?.companies ?? []).map((c: string) => ({ value: c, label: c })), ph: "All companies"  },
    { label: "Status",   key: "status"      as keyof Filters, opts: ["READY","STANDBY","RETIRED","DISCHARGED"].map(s => ({ value: s, label: s })), ph: "All statuses" },
    { label: "Platoon",  key: "platoon"     as keyof Filters, opts: (opts?.platoons   ?? []).map((p: string) => ({ value: p, label: p })), ph: "All platoons"  },
    { label: "Rank",     key: "rankCode"    as keyof Filters, opts: (opts?.ranks      ?? []).map((r: string) => ({ value: r, label: r })), ph: "All ranks"     },
    { label: "Sex",      key: "sex"         as keyof Filters, opts: [{ value: "M", label: "Male" }, { value: "F", label: "Female" }], ph: "All" },
    { label: "Duplicates", key: "isDuplicate" as keyof Filters,
      opts: [{ value: "true", label: "Duplicates only" }, { value: "false", label: "Clean only" }], ph: "All records" },
  ];

  return (
    <div className="flex flex-col h-full in">

      {/* Header */}
      <PageHeader
        title="Personnel Registry"
        subtitle={
          data
            ? `${data.meta.total.toLocaleString()} record${data.meta.total !== 1 ? "s" : ""}${isFetching ? " · refreshing…" : ""}`
            : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
              <Download size={12} /> Export
            </Button>
            {canEdit(role) && (
              <Button size="sm" onClick={openAdd}>
                <Plus size={12} /> Add Reservist
              </Button>
            )}
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-[rgb(var(--card))] border-b border-[rgb(var(--border))] flex-wrap">
        <SearchInput
          className="w-60"
          placeholder="Search name or AFPSN…"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          onClear={() => setFilter("search", "")}
        />

        <Button
          variant={activeFilters > 0 ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFilters > 0 && (
            <span className="ml-0.5 bg-[rgb(var(--blue))] text-white rounded-full w-4 h-4 flex items-center justify-center text-2xs font-bold">
              {activeFilters}
            </span>
          )}
          <ChevronDown size={10} className={cn("transition-transform", showFilters && "rotate-180")} />
        </Button>

        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={11} /> Clear filters
          </Button>
        )}

        {filters.isDuplicate === "true" && (
          <span className="flex items-center gap-1 text-2xs font-medium text-[rgb(var(--amber))] bg-[rgb(var(--amber-bg))] px-2 py-0.5 rounded border border-[rgb(var(--amber)/0.2)]">
            <AlertTriangle size={10} /> Duplicates only
          </span>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-5 py-3 bg-[rgb(var(--subtle))] border-b border-[rgb(var(--border))] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {filterDefs.map((fd) => (
            <div key={fd.key}>
              <Label>{fd.label}</Label>
              <Select
                value={filters[fd.key]}
                onChange={(e) => setFilter(fd.key, e.target.value)}
                placeholder={fd.ph}
                options={fd.opts}
              />
            </div>
          ))}
        </div>
      )}

      {/* Batch action bar */}
      {selectedIds.size > 0 && canDelete(role) && (
        <div className="flex items-center gap-3 px-5 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            {selectedIds.size} selected
          </span>
          <Button size="xs" variant="outline" onClick={() => setBatchStatusModal(true)}>
            Batch Status Update
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X size={11} /> Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-[rgb(var(--card))]">
        {isLoading ? (
          <Table>
            <thead><tr><Th>AFPSN</Th><Th>Name</Th><Th>Company</Th><Th>Platoon / Squad</Th><Th>Designation</Th><Th>Status</Th><Th>Mobile</Th><Th>Updated</Th></tr></thead>
            <tbody><TableSkeleton /></tbody>
          </Table>
        ) : !data?.data.length ? (
          <EmptyState
            icon={<Users size={18} />}
            title="No records found"
            description={activeFilters > 0 ? "Try clearing some filters." : "Add your first reservist record to get started."}
            action={
              canEdit(role) && activeFilters === 0
                ? <Button size="sm" onClick={openAdd}><Plus size={12} /> Add Reservist</Button>
                : activeFilters > 0
                ? <Button variant="outline" size="sm" onClick={clearFilters}><X size={11}/> Clear Filters</Button>
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col" style={{ minHeight: "100%" }}>
            <Table>
              <thead>
                <tr>
                  {canDelete(role) && (
                    <Th className="w-10">
                      <input type="checkbox" checked={data?.data?.length > 0 && data.data.every(r => selectedIds.has(r.id))}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-[rgb(var(--border))] text-blue-500 focus:ring-blue-400 cursor-pointer" />
                    </Th>
                  )}
                  <Th>AFPSN</Th>
                  <Th>Name</Th>
                  <Th>Company</Th>
                  <Th>Platoon / Squad</Th>
                  <Th>Designation</Th>
                  <Th>Status</Th>
                  <Th>Mobile</Th>
                  <Th>Updated</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <Tr
                    key={r.id}
                    className="group"
                    onClick={() => navigate(`/personnel/${r.id}`)}
                  >
                    {canDelete(role) && (
                      <Td>
                        <input type="checkbox" checked={selectedIds.has(r.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-[rgb(var(--border))] text-blue-500 focus:ring-blue-400 cursor-pointer" />
                      </Td>
                    )}
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[rgb(var(--ink-2))]">
                          {r.afpsn}
                        </span>
                        {r.isDuplicate && (
                          <span title="Duplicate AFPSN">
                            <AlertTriangle
                              size={11}
                              className="text-[rgb(var(--amber))] shrink-0"
                            />
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <p className="text-xs font-medium text-[rgb(var(--ink))]">{fullName(r)}</p>
                      <p className="text-2xs text-[rgb(var(--ink-3))]">
                        {r.rankCode} · {r.sex === "M" ? "Male" : "Female"}
                      </p>
                    </Td>
                    <Td className="text-xs">{r.company ?? "—"}</Td>
                    <Td>
                      <p className="text-xs">{r.platoon ?? "—"}</p>
                      {r.squadTeamSection && (
                        <p className="text-2xs text-[rgb(var(--ink-3))]">{r.squadTeamSection}</p>
                      )}
                    </Td>
                    <Td className="text-xs">{r.designationCode ?? "—"}</Td>
                    <Td><StatusBadge status={r.reservistStatus} /></Td>
                    <Td className="font-mono text-xs text-[rgb(var(--ink-3))]">
                      {r.mobileTelNo ?? "—"}
                    </Td>
                    <Td className="text-xs text-[rgb(var(--ink-3))]">
                      {formatDate(r.updatedAt)}
                    </Td>
                    <Td>
                      <RowMenu
                        record={r}
                        onView={() => navigate(`/personnel/${r.id}`)}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setDeleteTarget(r)}
                        canEditRecord={canEdit(role)}
                        canDeleteRecord={canDelete(role)}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>

            <div className="mt-auto">
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filters={filters}
      />

      {/* Add / Edit Modal */}
      <PersonnelModal
        open={modalOpen}
        onClose={closeModal}
        editRecord={editRecord}
      />

      {/* Batch Status Modal */}
      <Modal
        open={batchStatusModal}
        onClose={() => setBatchStatusModal(false)}
        title="Batch Status Update"
        subtitle={`Update status for ${selectedIds.size} selected records`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBatchStatusModal(false)}>Cancel</Button>
            <Button onClick={() => batchMutation.mutate()} loading={batchMutation.isPending}>
              Update {selectedIds.size} Records
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="New Status" required>
            <Select value={batchStatus} onChange={e => setBatchStatus(e.target.value)}
              options={["READY","STANDBY","RETIRED","DISCHARGED"].map(s => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Notes (optional)">
            <Input value={batchNotes} onChange={e => setBatchNotes(e.target.value)}
              placeholder="Reason for batch update..." />
          </FormField>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reservist"
        description={
          deleteTarget
            ? `Delete ${fullName(deleteTarget)}? This performs a soft delete — the record can be restored by an administrator.`
            : ""
        }
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        destructive
        confirmLabel="Delete Record"
      />
    </div>
  );
}
