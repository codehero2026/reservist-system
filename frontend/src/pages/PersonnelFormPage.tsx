// src/pages/PersonnelFormPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, AlertTriangle } from "lucide-react";
import { personnelApi } from "../lib/api";
import {
  Button, Input, Label, Select, Card, CardHeader, CardTitle, CardContent,
  Spinner, PageHeader,
} from "../components/ui/index";
import { toast } from "../components/ui/index";
import { useEffect } from "react";
import type { Reservist } from "../types";

const schema = z.object({
  afpsn: z.string().min(1, "AFPSN is required"),
  rankCode: z.string().min(1, "Rank is required"),
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  sex: z.enum(["M", "F"]),
  dateBirth: z.string().optional(),
  placeBirth: z.string().optional(),
  bloodType: z.string().optional(),
  religionCode: z.string().optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"]).optional(),
  tin: z.string().optional(),
  homeAddress: z.string().optional(),
  townProvinceCode: z.string().optional(),
  telephoneNo: z.string().optional(),
  mobileTelNo: z.string().optional(),
  brSvcCode: z.string().optional(),
  svcAfos: z.string().optional(),
  sourceCommissionCode: z.string().optional(),
  dateCommission: z.string().optional(),
  commissionAuthority: z.string().optional(),
  initialRank: z.string().optional(),
  dateLastPromotion: z.string().optional(),
  promotionAuthority: z.string().optional(),
  reservistStatus: z.enum(["READY", "STANDBY", "RETIRED", "DISCHARGED"]).default("READY"),
  mobilizationCode: z.string().optional(),
  designationCode: z.string().optional(),
  squadTeamSection: z.string().optional(),
  platoon: z.string().optional(),
  company: z.string().optional(),
  bnCode: z.string().optional(),
  presentOccupationCode: z.string().optional(),
  officeAddress: z.string().optional(),
  officeTelNo: z.string().optional(),
  sizeBoots: z.string().optional(),
  sizeCaps: z.string().optional(),
  sizeBda: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function F({ label, name, register, error, type = "text", placeholder }: {
  label: string; name: string; register: UseFormRegister<any>;
  error?: string; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} {...register(name as keyof FormData)} />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function PersonnelFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing, isLoading: loadingExisting } = useQuery<{ data: Reservist }>({
    queryKey: ["personnel", id],
    queryFn: async () => (await personnelApi.get(Number(id))).data,
    enabled: isEdit,
  });

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { reservistStatus: "READY", sex: "M" },
  });

  useEffect(() => {
    if (existing?.data) {
      const r = existing.data;
      reset({
        afpsn: r.afpsn, rankCode: r.rankCode, lastName: r.lastName,
        firstName: r.firstName, middleName: r.middleName ?? "",
        sex: r.sex, dateBirth: r.dateBirth?.slice(0, 10) ?? "",
        placeBirth: r.placeBirth ?? "", bloodType: r.bloodType ?? "",
        religionCode: r.religionCode ?? "",
        maritalStatus: r.maritalStatus ?? undefined,
        tin: r.tin ?? "", homeAddress: r.homeAddress ?? "",
        townProvinceCode: r.townProvinceCode ?? "",
        telephoneNo: r.telephoneNo ?? "", mobileTelNo: r.mobileTelNo ?? "",
        brSvcCode: r.brSvcCode ?? "", svcAfos: r.svcAfos ?? "",
        sourceCommissionCode: r.sourceCommissionCode ?? "",
        dateCommission: r.dateCommission?.slice(0, 10) ?? "",
        commissionAuthority: r.commissionAuthority ?? "",
        initialRank: r.initialRank ?? "",
        dateLastPromotion: r.dateLastPromotion?.slice(0, 10) ?? "",
        promotionAuthority: r.promotionAuthority ?? "",
        reservistStatus: r.reservistStatus,
        mobilizationCode: r.mobilizationCode ?? "",
        designationCode: r.designationCode ?? "",
        squadTeamSection: r.squadTeamSection ?? "",
        platoon: r.platoon ?? "", company: r.company ?? "",
        bnCode: r.bnCode ?? "",
        presentOccupationCode: r.presentOccupationCode ?? "",
        officeAddress: r.officeAddress ?? "", officeTelNo: r.officeTelNo ?? "",
        sizeBoots: r.sizeBoots ?? "", sizeCaps: r.sizeCaps ?? "",
        sizeBda: r.sizeBda ?? "",
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? personnelApi.update(Number(id), data as Record<string, unknown>) : personnelApi.create(data as Record<string, unknown>),
    onSuccess: (res) => {
      const isDup = res.data?.isDuplicate;
      toast(
        isEdit ? "Record updated successfully" : `Record created${isDup ? " — duplicate AFPSN flagged" : ""}`,
        isDup ? "info" : "success"
      );
      qc.invalidateQueries({ queryKey: ["personnel"] });
      navigate(isEdit ? `/personnel/${id}` : `/personnel/${res.data?.data?.id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      toast(e?.response?.data?.error || "Save failed", "error");
    },
  });

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={isEdit ? "Edit Reservist" : "Add New Reservist"}
        subtitle={isEdit ? `Editing record #${id}` : "Enter personnel details"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={13} /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit((data) => mutation.mutate(data))}
              loading={mutation.isPending}
              disabled={isEdit && !isDirty}
            >
              <Save size={13} /> {isEdit ? "Save Changes" : "Create Record"}
            </Button>
          </div>
        }
      />

      {!isEdit && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
            <AlertTriangle size={14} />
            If the AFPSN already exists in the database, the record will be flagged as a duplicate for review.
          </div>
        </div>
      )}

      <form className="flex-1 overflow-auto p-6 space-y-4"
        onSubmit={(e) => { e.preventDefault(); handleSubmit((data) => mutation.mutate(data))(); }}>

        <FormSection title="Personal Information">
          <F label="AFPSN *" name="afpsn" register={register} error={errors.afpsn?.message} placeholder="e.g. SK-R15-000261" />
          <F label="Rank Code *" name="rankCode" register={register} error={errors.rankCode?.message} placeholder="e.g. CPL" />
          <div>
            <Label>Sex *</Label>
            <Select {...register("sex")} value={watch("sex")}
              options={[{ value: "M", label: "Male" }, { value: "F", label: "Female" }]} />
          </div>
          <F label="Last Name *" name="lastName" register={register} error={errors.lastName?.message} />
          <F label="First Name *" name="firstName" register={register} error={errors.firstName?.message} />
          <F label="Middle Name" name="middleName" register={register} />
          <F label="Date of Birth" name="dateBirth" register={register} type="date" />
          <F label="Place of Birth" name="placeBirth" register={register} />
          <F label="Blood Type" name="bloodType" register={register} placeholder="A / B / O / AB" />
          <F label="Religion Code" name="religionCode" register={register} />
          <div>
            <Label>Marital Status</Label>
            <Select {...register("maritalStatus")} value={watch("maritalStatus") ?? ""}
              placeholder="Select status"
              options={["SINGLE","MARRIED","WIDOWED","SEPARATED"].map((s) => ({ value: s, label: s }))} />
          </div>
          <F label="TIN" name="tin" register={register} placeholder="xxx-xxx-xxx" />
        </FormSection>

        <FormSection title="Contact Information">
          <div className="sm:col-span-2">
            <F label="Home Address" name="homeAddress" register={register} />
          </div>
          <F label="Town / Province Code" name="townProvinceCode" register={register} />
          <F label="Telephone No." name="telephoneNo" register={register} />
          <F label="Mobile No." name="mobileTelNo" register={register} />
          <div className="sm:col-span-2">
            <F label="Office Address" name="officeAddress" register={register} />
          </div>
          <F label="Office Tel." name="officeTelNo" register={register} />
        </FormSection>

        <FormSection title="Military Service">
          <F label="Branch of Service" name="brSvcCode" register={register} placeholder="e.g. PA" />
          <F label="AFOS Classification" name="svcAfos" register={register} />
          <F label="Source Commission Code" name="sourceCommissionCode" register={register} />
          <F label="Date of Commission" name="dateCommission" register={register} type="date" />
          <div className="sm:col-span-2">
            <F label="Commission Authority" name="commissionAuthority" register={register} />
          </div>
          <F label="Initial Rank" name="initialRank" register={register} />
          <F label="Date Last Promotion" name="dateLastPromotion" register={register} type="date" />
          <div className="sm:col-span-2">
            <F label="Promotion Authority" name="promotionAuthority" register={register} />
          </div>
        </FormSection>

        <FormSection title="Unit Assignment">
          <div>
            <Label>Reservist Status *</Label>
            <Select {...register("reservistStatus")} value={watch("reservistStatus")}
              options={["READY","STANDBY","RETIRED","DISCHARGED"].map((s) => ({ value: s, label: s }))} />
          </div>
          <F label="Mobilization Code" name="mobilizationCode" register={register} />
          <F label="Designation Code" name="designationCode" register={register} placeholder="e.g. RIFLEMAN" />
          <F label="Squad / Team / Section" name="squadTeamSection" register={register} />
          <F label="Platoon" name="platoon" register={register} />
          <F label="Company" name="company" register={register} placeholder="e.g. ALPHA" />
          <F label="Battalion Code" name="bnCode" register={register} />
          <F label="Occupation Code" name="presentOccupationCode" register={register} />
        </FormSection>

        <FormSection title="Uniform Sizes">
          <F label="Boot Size" name="sizeBoots" register={register} placeholder="e.g. 9 WIDE" />
          <F label="Cap Size" name="sizeCaps" register={register} placeholder="e.g. 56" />
          <F label="BDA Size" name="sizeBda" register={register} placeholder="e.g. MEDIUM REGULAR" />
        </FormSection>

        {/* Bottom save bar */}
        <div className="flex justify-end gap-2 pt-2 pb-4">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>
            <Save size={14} /> {isEdit ? "Save Changes" : "Create Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
