import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeBranchCode } from "@/lib/branches";

export const dynamic = "force-dynamic";

interface BranchDistribution {
  branchCode: string;
  count: number;
  collegesWithSalary: number;
  collegesWithPlacement: number;
  collegesWithCutoff: number;
}

interface CollegeQuality {
  name: string;
  branchCount: number;
  missingSalary: number;
  missingPlacement: number;
  missingCutoff: number;
  hasScholarships: boolean;
  hasPathways: boolean;
}

interface DuplicateWarning {
  type: string;
  message: string;
  colleges: string[];
}

export async function GET() {
  const [
    totalColleges,
    totalBranches,
    totalScholarships,
    totalPathways,
    allBranches,
    allColleges,
    allScholarships,
    allPathways,
  ] = await Promise.all([
    prisma.college.count(),
    prisma.collegeBranch.count(),
    prisma.scholarship.count(),
    prisma.admissionPathway.count(),
    prisma.collegeBranch.findMany({
      select: {
        branchCode: true,
        collegeId: true,
        avgSalary: true,
        medianSalary: true,
        highestSalary: true,
        placementPercentage: true,
        minJeePercentileCutoff: true,
        minClass12Cutoff: true,
        college: { select: { name: true } },
      },
    }),
    prisma.college.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        website: true,
        officialApplyUrl: true,
        placementScore: true,
        collegeLifeScore: true,
        curriculumScore: true,
        metadata: true,
      },
    }),
    prisma.scholarship.findMany({
      select: { collegeId: true, name: true },
    }),
    prisma.admissionPathway.findMany({
      select: { collegeId: true, branchCode: true },
    }),
  ]);

  // ─── Branch Distribution ──────────────────────────────────────
  const branchMap = new Map<string, { count: number; withSalary: number; withPlacement: number; withCutoff: number }>();
  for (const b of allBranches) {
    const code = normalizeBranchCode(b.branchCode);
    const entry = branchMap.get(code) || { count: 0, withSalary: 0, withPlacement: 0, withCutoff: 0 };
    entry.count++;
    if (b.avgSalary || b.medianSalary || b.highestSalary) entry.withSalary++;
    if (b.placementPercentage) entry.withPlacement++;
    if (b.minJeePercentileCutoff || b.minClass12Cutoff) entry.withCutoff++;
    branchMap.set(code, entry);
  }

  const branchDistribution: BranchDistribution[] = ["CSE", "IT", "ECE"].map((code) => {
    const e = branchMap.get(code);
    return {
      branchCode: code,
      count: e?.count || 0,
      collegesWithSalary: e?.withSalary || 0,
      collegesWithPlacement: e?.withPlacement || 0,
      collegesWithCutoff: e?.withCutoff || 0,
    };
  });

  // ─── Missing Data Counts ──────────────────────────────────────
  let missingSalaryCount = 0;
  let missingPlacementCount = 0;
  let missingCutoffCount = 0;

  for (const b of allBranches) {
    if (!b.avgSalary && !b.medianSalary && !b.highestSalary) missingSalaryCount++;
    if (!b.placementPercentage) missingPlacementCount++;
    if (!b.minJeePercentileCutoff && !b.minClass12Cutoff) missingCutoffCount++;
  }

  // ─── College-Level Quality ────────────────────────────────────
  const collegeQuality: CollegeQuality[] = allColleges.map((c) => {
    const branches = allBranches.filter((b) => b.collegeId === c.id);
    const missingSalary = branches.filter((b) => !b.avgSalary && !b.medianSalary && !b.highestSalary).length;
    const missingPlacement = branches.filter((b) => !b.placementPercentage).length;
    const missingCutoff = branches.filter((b) => !b.minJeePercentileCutoff && !b.minClass12Cutoff).length;
    const hasScholarships = allScholarships.some((s) => s.collegeId === c.id);
    const hasPathways = allPathways.some((p) => p.collegeId === c.id);

    return {
      name: c.name,
      branchCount: branches.length,
      missingSalary,
      missingPlacement,
      missingCutoff,
      hasScholarships,
      hasPathways,
    };
  });

  // Colleges with 0 branches
  const collegesWithoutBranches = allColleges
    .filter((c) => !allBranches.some((b) => b.collegeId === c.id))
    .map((c) => c.name);

  // Colleges without scholarships
  const collegesWithoutScholarships = allColleges
    .filter((c) => !allScholarships.some((s) => s.collegeId === c.id))
    .map((c) => c.name);

  // Colleges without pathways
  const collegesWithoutPathways = allColleges
    .filter((c) => !allPathways.some((p) => p.collegeId === c.id))
    .map((c) => c.name);

  // ─── Duplicate Detection ──────────────────────────────────────
  const warnings: DuplicateWarning[] = [];

  // Name duplicates (normalized)
  const nameMap = new Map<string, string[]>();
  for (const c of allColleges) {
    const normalized = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const existing = nameMap.get(normalized) || [];
    existing.push(c.name);
    nameMap.set(normalized, existing);
  }
  for (const [, names] of nameMap) {
    if (names.length > 1) {
      warnings.push({
        type: "DUPLICATE_NAME",
        message: `Similar college names detected`,
        colleges: [...new Set(names)],
      });
    }
  }

  // City + State duplicates
  const locationMap = new Map<string, string[]>();
  for (const c of allColleges) {
    const key = `${c.city.toLowerCase()}|${c.state.toLowerCase()}`;
    const existing = locationMap.get(key) || [];
    existing.push(c.name);
    locationMap.set(key, existing);
  }
  for (const [, names] of locationMap) {
    if (names.length > 1) {
      warnings.push({
        type: "SAME_LOCATION",
        message: `Multiple colleges in same city`,
        colleges: [...new Set(names)],
      });
    }
  }

  // Website duplicates
  const websiteMap = new Map<string, string[]>();
  for (const c of allColleges) {
    if (c.website) {
      const normalized = c.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      const existing = websiteMap.get(normalized) || [];
      existing.push(c.name);
      websiteMap.set(normalized, existing);
    }
  }
  for (const [, names] of websiteMap) {
    if (names.length > 1) {
      warnings.push({
        type: "DUPLICATE_WEBSITE",
        message: `Same website URL for multiple colleges`,
        colleges: [...new Set(names)],
      });
    }
  }

  // ─── Health Score ─────────────────────────────────────────────
  const totalBranchSlots = allBranches.length;
  const salaryComplete = totalBranchSlots - missingSalaryCount;
  const placementComplete = totalBranchSlots - missingPlacementCount;
  const cutoffComplete = totalBranchSlots - missingCutoffCount;
  const scholarshipCoverage = allColleges.length > 0
    ? ((allColleges.length - collegesWithoutScholarships.length) / allColleges.length) * 100
    : 0;
  const pathwayCoverage = allColleges.length > 0
    ? ((allColleges.length - collegesWithoutPathways.length) / allColleges.length) * 100
    : 0;

  const completenessScore = totalBranchSlots > 0
    ? ((salaryComplete + placementComplete + cutoffComplete) / (totalBranchSlots * 3)) * 100
    : 0;

  const overallHealth = totalColleges === 0 && totalBranches === 0
    ? 0
    : Math.round(
        (completenessScore * 0.5 +
         scholarshipCoverage * 0.25 +
         pathwayCoverage * 0.25)
      );

  return NextResponse.json({
    summary: {
      totalColleges,
      totalBranches,
      totalScholarships,
      totalPathways,
      overallHealth,
    },
    branchDistribution,
    missingData: {
      missingSalaryCount,
      missingPlacementCount,
      missingCutoffCount,
      totalBranchSlots,
    },
    collegesWithoutBranches,
    collegesWithoutScholarships,
    collegesWithoutPathways,
    collegeQuality,
    duplicateWarnings: warnings,
  });
}
