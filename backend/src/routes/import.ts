// src/routes/import.ts
import { Hono } from "hono";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { createAuditLog } from "../services/audit";
import { notifyByRole } from "../services/notifications";

export const importRoutes = new Hono();
importRoutes.use("*", requireAuth);
importRoutes.use("*", requireRole("ADMIN", "S1_OFFICER"));

// Maps ANY known header variant → prisma field name
// Covers: original Excel, cleaned IMPORT_READY file, and snake_case variants
const buildColumnMap = (): Record<string, string> => {
  const map: Record<string, string> = {};

  const entries: [string[], string][] = [
    [["AFPSN", "afpsn"], "afpsn"],
    [["RankCode", "RANK CODE", "rank_code", "Rank", "RANK"], "rankCode"],
    [["LastName", "LAST NAME", "last_name", "Last Name"], "lastName"],
    [["FirstName", "FIRST NAME", "first_name", "First Name"], "firstName"],
    [["MiddleName", "MIDDLE NAME", "middle_name", "Middle Name"], "middleName"],
    [["HomeAddress", "HOME ADDRESS", "home_address", "Home Address"], "homeAddress"],
    [["TownProvinceCode", "TOWN PROVINCE CODE", "town_province_code", "Town Province Code"], "townProvinceCode"],
    [["TelephoneNo", "TELEPHONE NO", "telephone_no", "Telephone No"], "telephoneNo"],
    [["BrSvcCode", "BR SVC CODE", "br_svc_code", "Br Svc Code"], "brSvcCode"],
    [["SvcAFOS", "SVC AFOS", "svc_afos", "Svc Afos"], "svcAfos"],
    [["SourceCommissionCode", "SOURCE COMMISSION CODE", "source_commission_code"], "sourceCommissionCode"],
    [["DateCommission", "DATE COMMISSION", "date_commission", "Date Commission"], "dateCommission"],
    [["CommissionAuthority", "COMMISSION AUTHORITY", "commission_authority"], "commissionAuthority"],
    [["InitialRank", "INITIAL RANK", "initial_rank", "Initial Rank"], "initialRank"],
    [["DateLastPromotion", "DATE LAST PROMOTION", "date_last_promotion"], "dateLastPromotion"],
    [["PromotionAuthority", "PROMOTION AUTHORITY", "promotion_authority"], "promotionAuthority"],
    [["ReservistStatus", "RESERVIST STATUS", "reservist_status", "Status", "STATUS"], "reservistStatus"],
    [["MobilizationCode", "MOBILIZATION CODE", "mobilization_code"], "mobilizationCode"],
    [["DesignationCode", "DESIGNATION CODE", "designation_code", "Designation"], "designationCode"],
    [["SquadTeamSection", "SQUAD TEAM SECTION", "squad_team_section", "Squad"], "squadTeamSection"],
    [["Platoon", "PLATOON", "platoon"], "platoon"],
    [["Coy", "COY", "Company", "COMPANY", "company"], "company"],
    [["BnCode", "BN CODE", "bn_code", "Bn Code"], "bnCode"],
    [["PresentOccupationCode", "PRESENT OCCUPATION CODE", "present_occupation_code"], "presentOccupationCode"],
    [["OfficeAddress", "OFFICE ADDRESS", "office_address"], "officeAddress"],
    [["OfficeTelNo", "OFFICE TEL NO", "office_tel_no", "Office Tel No"], "officeTelNo"],
    [["MobileTelNo", "MOBILE TEL NO", "mobile_tel_no", "Mobile Tel No", "Mobile"], "mobileTelNo"],
    [["DateBirth", "DATE BIRTH", "date_birth", "Date Birth", "DateOfBirth"], "dateBirth"],
    [["PlaceBirth", "PLACE BIRTH", "place_birth", "Place Birth"], "placeBirth"],
    [["ReligionCode", "RELIGION CODE", "religion_code"], "religionCode"],
    [["BloodType", "BLOOD TYPE", "blood_type", "Blood Type"], "bloodType"],
    [["Sex", "SEX", "sex"], "sex"],
    [["TIN", "tin", "Tin"], "tin"],
    [["SizeBoots", "SIZE BOOTS", "size_boots", "Size Boots"], "sizeBoots"],
    [["SizeCaps", "SIZE CAPS", "size_caps", "Size Caps"], "sizeCaps"],
    [["SizeBDA", "SIZE BDA", "size_bda", "Size Bda"], "sizeBda"],
    [["MaritalStatus", "MARITAL STATUS", "marital_status", "Marital Status"], "maritalStatus"],
    [["DateOfRecord", "DATE OF RECORD", "date_of_record", "Date Of Record"], "dateOfRecord"],
    [["RecordBy", "RECORD BY", "record_by", "Record By"], "recordBy"],
    [["SourceSheet", "SOURCE SHEET", "source_sheet", "Source Sheet"], "sourceSheet"],
  ];

  for (const [aliases, target] of entries) {
    for (const alias of aliases) {
      map[alias] = target;
      map[alias.toLowerCase()] = target;
      map[alias.toUpperCase()] = target;
    }
  }
  return map;
};

const COLUMN_MAP = buildColumnMap();

function normalizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v || ["none", "nan", "n/a", "-", "—"].includes(v.toLowerCase())) return null;

  if (["dateCommission", "dateLastPromotion", "dateBirth", "dateOfRecord"].includes(key)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (key === "sex") {
    const u = v.toUpperCase();
    return u === "M" || u === "MALE" ? "M" : u === "F" || u === "FEMALE" ? "F" : null;
  }
  if (key === "reservistStatus") {
    const u = v.toUpperCase();
    if (["READY", "STANDBY", "RETIRED", "DISCHARGED"].includes(u)) return u;
    return "READY";
  }
  if (key === "maritalStatus") {
    const u = v.toUpperCase();
    if (["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"].includes(u)) return u;
    return null;
  }
  return v;
}

function mapRow(rawRow: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [rawKey, rawVal] of Object.entries(rawRow)) {
    // Try exact match first, then trimmed, then uppercase
    const prismaKey =
      COLUMN_MAP[rawKey] ||
      COLUMN_MAP[rawKey.trim()] ||
      COLUMN_MAP[rawKey.trim().toUpperCase()] ||
      COLUMN_MAP[rawKey.trim().toLowerCase()];

    if (prismaKey) {
      mapped[prismaKey] = normalizeValue(prismaKey, rawVal);
    }
  }
  return mapped;
}

function validateRow(row: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!row.afpsn) errors.push("AFPSN is required");
  if (!row.lastName) errors.push("LastName is required");
  if (!row.firstName) errors.push("FirstName is required");
  if (!row.rankCode) errors.push("RankCode is required");
  if (row.sex && !["M", "F"].includes(String(row.sex))) errors.push("Sex must be M or F");
  return errors;
}

// POST /api/import/preview
importRoutes.post("/preview", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch (e) {
    console.error("[Import Preview] Failed to parse form data:", e);
    return c.json({ error: "Failed to read uploaded file. Please try again." }, 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return c.json({ error: "No file uploaded" }, 400);
  if (!file.name.match(/\.(xlsx|xls)$/i)) return c.json({ error: "File must be .xlsx or .xls" }, 400);

  let rawRows: Record<string, unknown>[];
  let sheetNames: string[];
  let detectedHeaders: string[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    sheetNames = workbook.SheetNames;

    // Read ALL sheets and combine rows, skipping empty sheets
    rawRows = [];
    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
      if (sheetRows.length === 0) continue; // skip empty sheets
      for (const row of sheetRows) {
        rawRows.push({ ...row, SourceSheet: row["SourceSheet"] ?? name });
      }
    }

    detectedHeaders = Object.keys(rawRows[0] || {});
  } catch (e) {
    console.error("[Import Preview] XLSX parse error:", e);
    return c.json({ error: "Could not parse the Excel file. Make sure it is a valid .xlsx or .xls file." }, 400);
  }

  if (rawRows.length === 0) return c.json({ error: "File contains no data rows" }, 400);

  const mappedHeaders = detectedHeaders.filter(h => COLUMN_MAP[h] || COLUMN_MAP[h.trim().toUpperCase()]);
  console.log(`[Import] ${sheetNames.length} sheet(s), ${rawRows.length} total rows, ${mappedHeaders.length} mapped columns`);

  const mappedRows = rawRows.map((rawRow, index) => ({
    ...mapRow(rawRow),
    _rowIndex: index + 2,
  }));

  // Single batch query for all AFPSNs instead of one query per row
  const allAfpsns = mappedRows.map(r => String(r.afpsn ?? "")).filter(Boolean);
  const existingInDb = new Set(
    (await prisma.reservist.findMany({
      where: { afpsn: { in: allAfpsns }, isDeleted: false },
      select: { afpsn: true },
    })).map(r => r.afpsn)
  );

  const afpsnCountInFile = allAfpsns.reduce<Record<string, number>>((acc, a) => {
    acc[a] = (acc[a] || 0) + 1; return acc;
  }, {});

  const results = mappedRows.map((row) => {
    const errors = validateRow(row);
    const afpsn = String(row.afpsn ?? "");
    const isDuplicateInDb = afpsn ? existingInDb.has(afpsn) : false;
    const isDuplicateInFile = afpsn ? (afpsnCountInFile[afpsn] ?? 0) > 1 : false;
    return {
      rowIndex: row._rowIndex,
      data: row,
      errors,
      isDuplicateInDb,
      isDuplicateInFile,
      status: errors.length > 0 ? "error" : isDuplicateInDb || isDuplicateInFile ? "warning" : "ok",
    };
  });

  return c.json({
    rows: results,
    summary: {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      warnings: results.filter((r) => r.status === "warning").length,
      errors: results.filter((r) => r.status === "error").length,
    },
    sheetNames,
    detectedHeaders,
    mappedHeaders,
  });
});

// POST /api/import/commit
importRoutes.post("/commit", async (c) => {
  const user = c.get("user") as { userId: string };
  const body = await c.req.json();
  const { rows, filename } = body;
  if (!rows || !Array.isArray(rows)) return c.json({ error: "No rows provided" }, 400);

  const batch = await prisma.importBatch.create({
    data: {
      filename: filename || "upload.xlsx",
      uploadedById: user.userId,
      status: "PROCESSING",
      totalRows: rows.length,
    },
  });

  // Single query to find all existing AFPSNs
  const allAfpsns = rows.map((r: Record<string,unknown>) => String(r.afpsn || "")).filter(Boolean);
  const existingAfpsns = new Set(
    (await prisma.reservist.findMany({
      where: { afpsn: { in: allAfpsns }, isDeleted: false },
      select: { afpsn: true },
    })).map(r => r.afpsn)
  );

  // Build all records
  const toCreate = rows.map((row: Record<string,unknown>) => {
    const afpsn = String(row.afpsn || "");
    return {
      afpsn,
      rankCode: String(row.rankCode || ""),
      lastName: String(row.lastName || ""),
      firstName: String(row.firstName || ""),
      middleName: row.middleName ? String(row.middleName) : null,
      sex: (row.sex as "M" | "F") || null,
      dateBirth: row.dateBirth ? new Date(row.dateBirth as string) : null,
      placeBirth: row.placeBirth ? String(row.placeBirth) : null,
      bloodType: row.bloodType ? String(row.bloodType) : null,
      religionCode: row.religionCode ? String(row.religionCode) : null,
      maritalStatus: row.maritalStatus as "SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED" | null || null,
      tin: row.tin ? String(row.tin) : null,
      homeAddress: row.homeAddress ? String(row.homeAddress) : null,
      townProvinceCode: row.townProvinceCode ? String(row.townProvinceCode) : null,
      telephoneNo: row.telephoneNo ? String(row.telephoneNo) : null,
      mobileTelNo: row.mobileTelNo ? String(row.mobileTelNo) : null,
      brSvcCode: row.brSvcCode ? String(row.brSvcCode) : null,
      svcAfos: row.svcAfos ? String(row.svcAfos) : null,
      sourceCommissionCode: row.sourceCommissionCode ? String(row.sourceCommissionCode) : null,
      dateCommission: row.dateCommission ? new Date(row.dateCommission as string) : null,
      commissionAuthority: row.commissionAuthority ? String(row.commissionAuthority) : null,
      initialRank: row.initialRank ? String(row.initialRank) : null,
      dateLastPromotion: row.dateLastPromotion ? new Date(row.dateLastPromotion as string) : null,
      promotionAuthority: row.promotionAuthority ? String(row.promotionAuthority) : null,
      reservistStatus: (row.reservistStatus as "READY" | "STANDBY" | "RETIRED" | "DISCHARGED") || "READY",
      mobilizationCode: row.mobilizationCode ? String(row.mobilizationCode) : null,
      designationCode: row.designationCode ? String(row.designationCode) : null,
      squadTeamSection: row.squadTeamSection ? String(row.squadTeamSection) : null,
      platoon: row.platoon ? String(row.platoon) : null,
      company: row.company ? String(row.company) : null,
      bnCode: row.bnCode ? String(row.bnCode) : null,
      presentOccupationCode: row.presentOccupationCode ? String(row.presentOccupationCode) : null,
      officeAddress: row.officeAddress ? String(row.officeAddress) : null,
      officeTelNo: row.officeTelNo ? String(row.officeTelNo) : null,
      sizeBoots: row.sizeBoots ? String(row.sizeBoots) : null,
      sizeCaps: row.sizeCaps ? String(row.sizeCaps) : null,
      sizeBda: row.sizeBda ? String(row.sizeBda) : null,
      dateOfRecord: row.dateOfRecord ? new Date(row.dateOfRecord as string) : null,
      recordBy: row.recordBy ? String(row.recordBy) : null,
      sourceSheet: row.sourceSheet ? String(row.sourceSheet) : null,
      isDuplicate: existingAfpsns.has(afpsn),
      importBatchId: batch.id,
    };
  });

  // Insert in chunks of 500 to stay within Neon's query size limits
  const CHUNK_SIZE = 500;
  let successRows = 0;
  for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
    const chunk = toCreate.slice(i, i + CHUNK_SIZE);
    const { count } = await prisma.reservist.createMany({ data: chunk, skipDuplicates: false });
    successRows += count;
  }
  const dupRows = toCreate.filter(r => r.isDuplicate).length;
  const errorRows = rows.length - successRows;

  // Respond immediately — don't block on dedup group creation or audit logging
  // so large imports don't timeout on Render's 30s limit
  const response = c.json({ batchId: batch.id, successRows, errorRows, dupRows, errorLog: [] });

  // Fire-and-forget: update batch status + create dedup groups in background
  (async () => {
    try {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: "COMPLETED", successRows, errorRows, dupRows, errorLog: [], completedAt: new Date() },
      });

      const duplicateAfpsns = [...new Set(toCreate.filter(r => r.isDuplicate).map(r => r.afpsn))];
      for (const afpsn of duplicateAfpsns) {
        const newRecords = await prisma.reservist.findMany({
          where: { afpsn, isDeleted: false },
          select: { id: true },
        });
        if (newRecords.length < 2) continue; // DB was reset or records no longer exist
        const existingGroup = await prisma.dedupGroup.findFirst({ where: { afpsn, status: "PENDING" } });
        if (!existingGroup) {
          await prisma.dedupGroup.create({
            data: { afpsn, members: { connect: newRecords.map(r => ({ id: r.id })) } },
          });
        } else {
          await prisma.dedupGroup.update({
            where: { id: existingGroup.id },
            data: { members: { connect: newRecords.map(r => ({ id: r.id })) } },
          });
        }
      }

      await createAuditLog({
        userId: user.userId, action: "IMPORT", tableName: "reservists", recordId: batch.id,
        notes: `Imported ${successRows} records, ${dupRows} duplicates, ${errorRows} errors`,
      });
      notifyByRole(["ADMIN", "S1_OFFICER"], "import", "Import Completed", `${successRows} records imported, ${dupRows} duplicates.`, "/import");
    } catch (e) {
      console.error("[Import] Background post-processing error:", e);
    }
  })();

  return response;
});

// GET /api/import/batches
importRoutes.get("/batches", async (c) => {
  const page = Number(c.req.query("page") || 1);
  const limit = Number(c.req.query("limit") || 10);
  const [total, batches] = await Promise.all([
    prisma.importBatch.count(),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { uploadedBy: { select: { fullName: true, email: true } } },
    }),
  ]);
  return c.json({ data: batches, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
});
