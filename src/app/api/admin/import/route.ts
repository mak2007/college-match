import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { normalizeBranchCode } from "@/lib/branches";

async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;
  if (!token) return false;
  const decoded = await verifyToken(token);
  return decoded !== null && decoded.role === "SUPERADMIN";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ImportRow {
  [key: string]: string | number | boolean | null | undefined;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

function num(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ""));
  return isNaN(n) ? fallback : n;
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

function normalizeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, "") // strip parenthetical abbreviations
    .replace(/[^a-z0-9]/g, "");
}

// ─── DUPLICATE DETECTION ──────────────────────────────────────────
async function findDuplicateCollege(name: string, state: string, city: string, website: string) {
  const normalizedName = normalizeName(name);
  const slug = slugify(name);

  // 1. Exact slug match
  const bySlug = await prisma.college.findUnique({ where: { slug } });
  if (bySlug) return bySlug;

  // 2. Normalized name match (handles "VIT" vs "Vellore Institute of Technology")
  const allColleges = await prisma.college.findMany();
  for (const c of allColleges) {
    if (normalizeName(c.name) === normalizedName) return c;
  }

  // 3. Same city + state + similar name (fuzzy: first 10 chars of normalized name match)
  const namePrefix = normalizedName.substring(0, 10);
  for (const c of allColleges) {
    if (
      c.state.toLowerCase() === state.toLowerCase() &&
      c.city.toLowerCase() === city.toLowerCase() &&
      normalizeName(c.name).substring(0, 10) === namePrefix
    ) {
      return c;
    }
  }

  // 4. Website URL match (if provided)
  if (website) {
    for (const c of allColleges) {
      if (c.website && c.website.toLowerCase() === website.toLowerCase()) return c;
    }
  }

  return null;
}

// ─── COLLEGE IMPORT ───────────────────────────────────────────────
async function importColleges(rows: ImportRow[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = str(row.name);
    const state = str(row.state);
    const city = str(row.city);

    if (!name) { errors.push({ row: rowNum, field: "name", message: "Required" }); skipped++; continue; }
    if (!state) { errors.push({ row: rowNum, field: "state", message: "Required" }); skipped++; continue; }
    if (!city) { errors.push({ row: rowNum, field: "city", message: "Required" }); skipped++; continue; }

    const slug = slugify(name);
    const ps = num(row.placementScore);
    const cls = num(row.collegeLifeScore);
    const cs = num(row.curriculumScore);

    if (ps < 0 || ps > 10) errors.push({ row: rowNum, field: "placementScore", message: "Must be 0-10" });
    if (cls < 0 || cls > 10) errors.push({ row: rowNum, field: "collegeLifeScore", message: "Must be 0-10" });
    if (cs < 0 || cs > 10) errors.push({ row: rowNum, field: "curriculumScore", message: "Must be 0-10" });

    if (errors.some(e => e.row === rowNum)) { skipped++; continue; }

    const metadata: Record<string, number> = {};
    for (const key of ["nirf_ranking", "infra_rating", "startup_ecosystem", "research_output", "international_exposure"]) {
      const v = num(row[key], NaN);
      if (!isNaN(v)) metadata[key] = v;
    }

    try {
      const existing = await findDuplicateCollege(name, state, city, str(row.website));
      if (existing) {
        const mergedMeta = { ...JSON.parse(existing.metadata || "{}"), ...metadata };
        await prisma.college.update({
          where: { id: existing.id },
          data: {
            name, state, city,
            officialApplyUrl: str(row.officialApplyUrl) || existing.officialApplyUrl,
            website: str(row.website) || existing.website,
            logoUrl: str(row.logoUrl) || existing.logoUrl,
            coverImageUrl: str(row.coverImageUrl) || existing.coverImageUrl,
            brochureUrl: str(row.brochureUrl) || existing.brochureUrl,
            isPartner: str(row.isPartner).toLowerCase() === "true",
            commissionRate: num(row.commissionRate),
            placementScore: ps,
            collegeLifeScore: cls,
            curriculumScore: cs,
            metadata: JSON.stringify(mergedMeta),
          },
        });
        updated++;
      } else {
        await prisma.college.create({
          data: {
            name, slug, state, city,
            officialApplyUrl: str(row.officialApplyUrl) || "https://example.com/apply",
            website: str(row.website) || null,
            logoUrl: str(row.logoUrl) || null,
            coverImageUrl: str(row.coverImageUrl) || null,
            brochureUrl: str(row.brochureUrl) || null,
            isPartner: str(row.isPartner).toLowerCase() === "true",
            commissionRate: num(row.commissionRate),
            placementScore: ps,
            collegeLifeScore: cls,
            curriculumScore: cs,
            metadata: Object.keys(metadata).length ? JSON.stringify(metadata) : null,
          },
        });
        created++;
      }
    } catch (err: any) {
      errors.push({ row: rowNum, field: "database", message: err.message });
      skipped++;
    }
  }

  return { success: errors.length === 0, totalRows: rows.length, created, updated, skipped, errors };
}

// ─── BRANCH IMPORT ────────────────────────────────────────────────
async function importBranches(rows: ImportRow[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const colleges = await prisma.college.findMany({ select: { id: true, name: true, slug: true } });
  const byName = new Map(colleges.map(c => [c.name.toLowerCase(), c]));
  const bySlug = new Map(colleges.map(c => [c.slug, c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const collegeName = str(row.collegeName || row.college);
    const branchCode = normalizeBranchCode(str(row.branchCode));
    const branchName = str(row.branchName);

    if (!collegeName) { errors.push({ row: rowNum, field: "collegeName", message: "Required" }); skipped++; continue; }
    if (!branchCode) { errors.push({ row: rowNum, field: "branchCode", message: "Required" }); skipped++; continue; }
    if (!branchName) { errors.push({ row: rowNum, field: "branchName", message: "Required" }); skipped++; continue; }

    const college = byName.get(collegeName.toLowerCase()) || bySlug.get(slugify(collegeName));
    if (!college) { errors.push({ row: rowNum, field: "collegeName", message: `College "${collegeName}" not found` }); skipped++; continue; }

    const tFee = num(row.tuitionFeeAnnual);
    const hFee = num(row.hostelFeeAnnual);
    const bss = num(row.branchStrengthScore, 7);

    if (tFee < 0) errors.push({ row: rowNum, field: "tuitionFeeAnnual", message: "Must be ≥ 0" });
    if (hFee < 0) errors.push({ row: rowNum, field: "hostelFeeAnnual", message: "Must be ≥ 0" });
    if (bss < 0 || bss > 10) errors.push({ row: rowNum, field: "branchStrengthScore", message: "Must be 0-10" });

    if (errors.some(e => e.row === rowNum)) { skipped++; continue; }

    try {
      const existing = await prisma.collegeBranch.findUnique({
        where: { collegeId_branchCode: { collegeId: college.id, branchCode } },
      });

      const data = {
        branchName,
        tuitionFeeAnnual: tFee,
        hostelFeeAnnual: hFee,
        seatCapacity: parseInt(String(row.seatCapacity || "0")) || 0,
        avgSalary: row.avgSalary ? num(row.avgSalary) : null,
        medianSalary: row.medianSalary ? num(row.medianSalary) : null,
        highestSalary: row.highestSalary ? num(row.highestSalary) : null,
        minJeePercentileCutoff: row.minJeePercentileCutoff ? num(row.minJeePercentileCutoff) : null,
        minClass12Cutoff: row.minClass12Cutoff ? num(row.minClass12Cutoff) : null,
        branchStrengthScore: bss,
        placementPercentage: row.placementPercentage ? num(row.placementPercentage) : null,
      };

      if (existing) {
        await prisma.collegeBranch.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.collegeBranch.create({ data: { ...data, collegeId: college.id, branchCode } });
        created++;
      }
    } catch (err: any) {
      errors.push({ row: rowNum, field: "database", message: err.message });
      skipped++;
    }
  }

  return { success: errors.length === 0, totalRows: rows.length, created, updated, skipped, errors };
}

// ─── SCHOLARSHIP IMPORT ───────────────────────────────────────────
async function importScholarships(rows: ImportRow[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const colleges = await prisma.college.findMany({ select: { id: true, name: true, slug: true } });
  const byName = new Map(colleges.map(c => [c.name.toLowerCase(), c]));
  const bySlug = new Map(colleges.map(c => [c.slug, c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const collegeName = str(row.collegeName || row.college);
    const name = str(row.name);

    if (!collegeName) { errors.push({ row: rowNum, field: "collegeName", message: "Required" }); skipped++; continue; }
    if (!name) { errors.push({ row: rowNum, field: "name", message: "Required" }); skipped++; continue; }

    const college = byName.get(collegeName.toLowerCase()) || bySlug.get(slugify(collegeName));
    if (!college) { errors.push({ row: rowNum, field: "collegeName", message: `College "${collegeName}" not found` }); skipped++; continue; }

    const amount = num(row.amount);
    const amountType = str(row.amountType || "FIXED").toUpperCase();
    const description = str(row.description) || null;
    const isActive = str(row.isActive || "true").toLowerCase() !== "false";
    const criteria = str(row.criteria) || null;

    if (!["FIXED", "PERCENTAGE", "TUITION_WAIVER"].includes(amountType)) {
      errors.push({ row: rowNum, field: "amountType", message: "Must be FIXED, PERCENTAGE, or TUITION_WAIVER" });
    }

    if (errors.some(e => e.row === rowNum)) { skipped++; continue; }

    try {
      const existing = await prisma.scholarship.findFirst({ where: { collegeId: college.id, name } });
      if (existing) {
        await prisma.scholarship.update({
          where: { id: existing.id },
          data: { amountType, amount, description, isActive, criteria },
        });
        updated++;
      } else {
        await prisma.scholarship.create({
          data: { collegeId: college.id, name, amountType, amount, description, isActive, criteria },
        });
        created++;
      }
    } catch (err: any) {
      errors.push({ row: rowNum, field: "database", message: err.message });
      skipped++;
    }
  }

  return { success: errors.length === 0, totalRows: rows.length, created, updated, skipped, errors };
}

// ─── ADMISSION PATHWAY IMPORT ─────────────────────────────────────
async function importAdmissionPathways(rows: ImportRow[]): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const colleges = await prisma.college.findMany({ select: { id: true, name: true, slug: true } });
  const byName = new Map(colleges.map(c => [c.name.toLowerCase(), c]));
  const bySlug = new Map(colleges.map(c => [c.slug, c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const collegeName = str(row.collegeName || row.college);
    const branchCode = normalizeBranchCode(str(row.branchCode));
    const admissionExam = str(row.admissionExam);

    if (!collegeName) { errors.push({ row: rowNum, field: "collegeName", message: "Required" }); skipped++; continue; }
    if (!branchCode) { errors.push({ row: rowNum, field: "branchCode", message: "Required" }); skipped++; continue; }
    if (!admissionExam) { errors.push({ row: rowNum, field: "admissionExam", message: "Required" }); skipped++; continue; }

    const college = byName.get(collegeName.toLowerCase()) || bySlug.get(slugify(collegeName));
    if (!college) { errors.push({ row: rowNum, field: "collegeName", message: `College "${collegeName}" not found` }); skipped++; continue; }

    const equivalentJeePercentile = row.equivalentJeePercentile ? num(row.equivalentJeePercentile) : null;
    const admissionMode = str(row.admissionMode) || null;

    try {
      const existing = await prisma.admissionPathway.findUnique({
        where: { collegeId_branchCode_admissionExam: { collegeId: college.id, branchCode, admissionExam } },
      });

      if (existing) {
        await prisma.admissionPathway.update({
          where: { id: existing.id },
          data: { equivalentJeePercentile, admissionMode },
        });
        updated++;
      } else {
        await prisma.admissionPathway.create({
          data: { collegeId: college.id, branchCode, admissionExam, equivalentJeePercentile, admissionMode },
        });
        created++;
      }
    } catch (err: any) {
      errors.push({ row: rowNum, field: "database", message: err.message });
      skipped++;
    }
  }

  return { success: errors.length === 0, totalRows: rows.length, created, updated, skipped, errors };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { type, rows } = body;

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Missing required fields: type, rows[]" }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "Maximum 1000 rows per import" }, { status: 400 });
    }

    let result: ImportResult;

    switch (type) {
      case "colleges":
        result = await importColleges(rows);
        break;
      case "branches":
        result = await importBranches(rows);
        break;
      case "scholarships":
        result = await importScholarships(rows);
        break;
      case "admission_pathways":
        result = await importAdmissionPathways(rows);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown type: "${type}". Use: colleges, branches, scholarships, admission_pathways` },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Import Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
