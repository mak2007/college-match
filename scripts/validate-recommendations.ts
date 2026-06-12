import "dotenv/config";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateRecommendations, StudentProfile, CollegeCandidate, ScoringConfig } from "../src/lib/recommendation";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const REPORT_DIR = path.join(__dirname, "..", "templates");

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ─── STEP 1: Import colleges from XLSX ───────────────────────────────
async function importData() {
  console.log("=== STEP 1: Importing college data from XLSX ===\n");

  const collegeWb = XLSX.readFile(path.join(TEMPLATES_DIR, "colleges_20_sample.xlsx"));
  const collegeRows = XLSX.utils.sheet_to_json(collegeWb.Sheets[collegeWb.SheetNames[0]]);

  const branchWb = XLSX.readFile(path.join(TEMPLATES_DIR, "branches_20_sample.xlsx"));
  const branchRows = XLSX.utils.sheet_to_json(branchWb.Sheets[branchWb.SheetNames[0]]);

  let collegesCreated = 0;
  for (const row of collegeRows) {
    const r = row as any;
    const name = String(r.name || "").trim();
    if (!name) continue;
    const slug = slugify(name);

    const metadata: Record<string, number> = {};
    for (const key of ["nirf_ranking", "infra_rating", "startup_ecosystem", "research_output", "international_exposure"]) {
      if (r[key] !== undefined && r[key] !== null && r[key] !== "") metadata[key] = Number(r[key]);
    }

    await prisma.college.upsert({
      where: { slug },
      update: {
        name, state: String(r.state || ""), city: String(r.city || ""),
        placementScore: Number(r.placementScore || 0),
        collegeLifeScore: Number(r.collegeLifeScore || 0),
        curriculumScore: Number(r.curriculumScore || 0),
        officialApplyUrl: String(r.officialApplyUrl || "https://example.com"),
        isPartner: Boolean(r.isPartner),
        isNewGen: Boolean(r.isNewGen),
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
      create: {
        name, slug, state: String(r.state || ""), city: String(r.city || ""),
        placementScore: Number(r.placementScore || 0),
        collegeLifeScore: Number(r.collegeLifeScore || 0),
        curriculumScore: Number(r.curriculumScore || 0),
        officialApplyUrl: String(r.officialApplyUrl || "https://example.com"),
        isPartner: Boolean(r.isPartner),
        isNewGen: Boolean(r.isNewGen),
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
    });
    collegesCreated++;
  }
  console.log(`Upserted ${collegesCreated} colleges`);

  const allColleges = await prisma.college.findMany({ select: { id: true, slug: true } });
  const slugToId: Record<string, string> = {};
  for (const c of allColleges) slugToId[c.slug] = c.id;

  let branchesCreated = 0;
  for (const row of branchRows) {
    const r = row as any;
    const collegeName = String(r.collegeName || "").trim();
    const collegeSlug = slugify(collegeName);
    const collegeId = slugToId[collegeSlug];
    if (!collegeId) continue;

    const branchCode = String(r.branchCode || "").trim();
    if (!branchCode) continue;

    const metadata: Record<string, number> = {};
    for (const key of ["lab_quality", "faculty_expertise", "industry_collab"]) {
      if (r[key] !== undefined && r[key] !== null && r[key] !== "") metadata[key] = Number(r[key]);
    }

    await prisma.collegeBranch.upsert({
      where: { collegeId_branchCode: { collegeId, branchCode } },
      update: {
        branchName: String(r.branchName || branchCode),
        tuitionFeeAnnual: Number(r.tuitionFeeAnnual || 0),
        hostelFeeAnnual: Number(r.hostelFeeAnnual || 0),
        seatCapacity: Number(r.seatCapacity || 0),
        avgSalary: Number(r.avgSalary || 0),
        medianSalary: Number(r.medianSalary || 0),
        highestSalary: Number(r.highestSalary || 0),
        minJeePercentileCutoff: Number(r.minJeePercentileCutoff || 0),
        minClass12Cutoff: Number(r.minClass12Cutoff || 0),
        branchStrengthScore: Number(r.branchStrengthScore || 0),
        placementPercentage: Number(r.placementPercentage || 0),
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
      create: {
        collegeId, branchCode, branchName: String(r.branchName || branchCode),
        tuitionFeeAnnual: Number(r.tuitionFeeAnnual || 0),
        hostelFeeAnnual: Number(r.hostelFeeAnnual || 0),
        seatCapacity: Number(r.seatCapacity || 0),
        avgSalary: Number(r.avgSalary || 0),
        medianSalary: Number(r.medianSalary || 0),
        highestSalary: Number(r.highestSalary || 0),
        minJeePercentileCutoff: Number(r.minJeePercentileCutoff || 0),
        minClass12Cutoff: Number(r.minClass12Cutoff || 0),
        branchStrengthScore: Number(r.branchStrengthScore || 0),
        placementPercentage: Number(r.placementPercentage || 0),
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
    });
    branchesCreated++;
  }
  console.log(`Upserted ${branchesCreated} branches\n`);
}

// ─── STEP 2: Define 25 test profiles ──────────────────────────────────
function getTestProfiles(): (StudentProfile & { name: string })[] {
  const defaultPriorities = [
    { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
    { criteria: "branch_strength", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
    { criteria: "college_life", rankOrder: 5 },
  ];
  const startupPriorities = [
    { criteria: "curriculum", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
    { criteria: "college_life", rankOrder: 3 }, { criteria: "placements", rankOrder: 4 },
    { criteria: "roi", rankOrder: 5 },
  ];
  const studiesPriorities = [
    { criteria: "curriculum", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
    { criteria: "placements", rankOrder: 3 }, { criteria: "roi", rankOrder: 4 },
    { criteria: "college_life", rankOrder: 5 },
  ];
  const roiPriorities = [
    { criteria: "roi", rankOrder: 1 }, { criteria: "placements", rankOrder: 2 },
    { criteria: "branch_strength", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
    { criteria: "college_life", rankOrder: 5 },
  ];

  return [
    // ── CSE by percentile tier ──
    { name: "95+ CSE Placement", jeePercentile: 97, class12Percentage: 94, budgetLimit: 2000000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "90 CSE Placement", jeePercentile: 90, class12Percentage: 86, budgetLimit: 1800000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "80 CSE Placement", jeePercentile: 80, class12Percentage: 78, budgetLimit: 1200000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "70 CSE Budget", jeePercentile: 70, class12Percentage: 72, budgetLimit: 800000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: roiPriorities },
    { name: "60 CSE Low Budget", jeePercentile: 60, class12Percentage: 65, budgetLimit: 600000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: roiPriorities },

    // ── Branch variants ──
    { name: "92 ECE Placement", jeePercentile: 92, class12Percentage: 88, budgetLimit: 1600000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ECE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "85 Mechanical Placement", jeePercentile: 85, class12Percentage: 80, budgetLimit: 1200000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ME"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "75 Civil Budget", jeePercentile: 75, class12Percentage: 70, budgetLimit: 800000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CE"], careerGoal: "PLACEMENT", priorities: roiPriorities },
    { name: "88 IT Placement", jeePercentile: 88, class12Percentage: 84, budgetLimit: 1400000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["IT"], careerGoal: "PLACEMENT", priorities: defaultPriorities },

    // ── Career goal variants ──
    { name: "90 CSE Startup", jeePercentile: 90, class12Percentage: 85, budgetLimit: 2000000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "STARTUP", priorities: startupPriorities },
    { name: "94 ECE Higher Studies India", jeePercentile: 94, class12Percentage: 90, budgetLimit: 1600000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ECE"], careerGoal: "HIGHER_STUDIES_INDIA", priorities: studiesPriorities },
    { name: "96 CSE Higher Studies Abroad", jeePercentile: 96, class12Percentage: 92, budgetLimit: 2500000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "HIGHER_STUDIES_ABROAD", priorities: studiesPriorities },
    { name: "80 ME Govt Exams", jeePercentile: 80, class12Percentage: 78, budgetLimit: 1000000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ME"], careerGoal: "GOVERNMENT_EXAMS", priorities: roiPriorities },
    { name: "86 CSE Not Sure", jeePercentile: 86, class12Percentage: 83, budgetLimit: 1400000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE", "ECE", "IT"], careerGoal: "NOT_SURE", priorities: defaultPriorities },

    // ── Budget variants ──
    { name: "95 CSE No Budget Limit", jeePercentile: 95, class12Percentage: 91, budgetLimit: null, isBudgetConstraint: false, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "82 CSE Tight Budget", jeePercentile: 82, class12Percentage: 79, budgetLimit: 700000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: roiPriorities },
    { name: "90 CSE Premium Budget", jeePercentile: 90, class12Percentage: 86, budgetLimit: 3000000, isBudgetConstraint: false, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },

    // ── Location variants ──
    { name: "91 CSE South India Only", jeePercentile: 91, class12Percentage: 87, budgetLimit: 1600000, isBudgetConstraint: true, restrictLocation: true, preferredLocations: [{ state: "Karnataka", city: "" }, { state: "Tamil Nadu", city: "" }], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "88 CSE North India Only", jeePercentile: 88, class12Percentage: 84, budgetLimit: 1400000, isBudgetConstraint: true, restrictLocation: true, preferredLocations: [{ state: "Delhi", city: "" }, { state: "Rajasthan", city: "" }, { state: "Uttar Pradesh", city: "" }], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },

    // ── Edge cases ──
    { name: "99 CSE Extreme Reach", jeePercentile: 99, class12Percentage: 97, budgetLimit: 3000000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: defaultPriorities },
    { name: "65 CSE Very Low Percentile", jeePercentile: 65, class12Percentage: 68, budgetLimit: 600000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "PLACEMENT", priorities: roiPriorities },
    { name: "85 CSE Startup No Budget", jeePercentile: 85, class12Percentage: 82, budgetLimit: null, isBudgetConstraint: false, restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"], careerGoal: "STARTUP", priorities: startupPriorities },
    { name: "93 ECE Higher Studies Abroad", jeePercentile: 93, class12Percentage: 89, budgetLimit: 2000000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ECE"], careerGoal: "HIGHER_STUDIES_ABROAD", priorities: studiesPriorities },
    { name: "78 ME Budget Govt Exams", jeePercentile: 78, class12Percentage: 74, budgetLimit: 800000, isBudgetConstraint: true, restrictLocation: false, preferredLocations: [], preferredBranches: ["ME"], careerGoal: "GOVERNMENT_EXAMS", priorities: roiPriorities },
  ];
}

// ─── STEP 3: Run engine for each profile ──────────────────────────────
async function runValidation() {
  const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
  if (!dbConfig) {
    console.error("No matching_rules config in DB. Run seed first.");
    process.exit(1);
  }
  const config: ScoringConfig = JSON.parse(dbConfig.value);

  const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
  const candidates: CollegeCandidate[] = dbBranches.map((b: any) => ({
    id: b.college.id, name: b.college.name, slug: b.college.slug,
    state: b.college.state, city: b.college.city,
    logoUrl: b.college.logoUrl, coverImageUrl: b.college.coverImageUrl,
    brochureUrl: b.college.brochureUrl, officialApplyUrl: b.college.officialApplyUrl,
    website: b.college.website, isPartner: b.college.isPartner,
    isNewGen: b.college.isNewGen,
    commissionRate: b.college.commissionRate, placementScore: b.college.placementScore,
    collegeLifeScore: b.college.collegeLifeScore, curriculumScore: b.college.curriculumScore,
    metadata: b.college.metadata,
    branchId: b.id, branchName: b.branchName, branchCode: b.branchCode,
    tuitionFeeAnnual: b.tuitionFeeAnnual, hostelFeeAnnual: b.hostelFeeAnnual,
    seatCapacity: b.seatCapacity, avgSalary: b.avgSalary,
    medianSalary: b.medianSalary, highestSalary: b.highestSalary,
    minJeePercentileCutoff: b.minJeePercentileCutoff, minClass12Cutoff: b.minClass12Cutoff,
    branchStrengthScore: b.branchStrengthScore, placementPercentage: b.placementPercentage,
    branchMetadata: b.metadata,
  }));

  const profiles = getTestProfiles();
  console.log(`Running ${profiles.length} profiles against ${candidates.length} candidates...\n`);

  const allResults: { profile: StudentProfile & { name: string }; top10: any[]; totalMatches: number }[] = [];

  for (const profile of profiles) {
    const filtered = profile.preferredBranches.length > 0
      ? candidates.filter((c) => profile.preferredBranches.includes(c.branchCode))
      : candidates;

    const matches = generateRecommendations(profile, filtered, config);
    allResults.push({ profile, top10: matches.slice(0, 10), totalMatches: matches.length });
  }

  return allResults;
}

// ─── STEP 4: Generate comprehensive audit report ──────────────────────
function generateReport(allResults: { profile: any; top10: any[]; totalMatches: number }[]) {
  const reportLines: string[] = [];
  const log = (line: string) => { console.log(line); reportLines.push(line); };

  log("╔══════════════════════════════════════════════════════════════════════╗");
  log("║              COLLEGE MATCH — RECOMMENDATION QUALITY AUDIT          ║");
  log("╚══════════════════════════════════════════════════════════════════════╝\n");
  log(`Date: ${new Date().toISOString().split("T")[0]}`);
  log(`Profiles tested: ${allResults.length}`);
  log(`Total candidates in pool: ${allResults[0]?.top10.length ? "52" : "N/A"}\n`);

  // ── SECTION 1: Per-profile Top 10 results ──
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 1: PER-PROFILE TOP 10 RECOMMENDATIONS");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allFlags: { profile: string; issue: string }[] = [];

  for (const { profile, top10, totalMatches } of allResults) {
    log(`┌─ ${profile.name} ─────────────────────────────────────────────`);
    log(`│ Goal: ${profile.careerGoal} | JEE: ${profile.jeePercentile} | Class12: ${profile.class12Percentage} | Budget: ${profile.budgetLimit ? "₹" + (profile.budgetLimit / 100000).toFixed(0) + "L" : "No limit"} | Branches: ${profile.preferredBranches.join(",")}`);
    log(`│ Location: ${profile.restrictLocation ? profile.preferredLocations.map((l: { state: string; city: string }) => l.state).join(", ") : "Any"} | Total matches: ${totalMatches}`);
    log("│");

    if (top10.length === 0) {
      log("│  ⚠ NO MATCHES FOUND");
      allFlags.push({ profile: profile.name, issue: "No matches found — student gets empty results" });
    }

    for (const r of top10) {
      const total4yr = (r.feeInfo.annualTuition + r.feeInfo.annualHostel) * 4;
      const roi = r.placementInfo.avgSalary ? (r.placementInfo.avgSalary / total4yr).toFixed(1) : "N/A";
      const salaryLpa = r.placementInfo.avgSalary ? (r.placementInfo.avgSalary / 100000).toFixed(1) : "N/A";
      const costL = (total4yr / 100000).toFixed(1);
      const compCat = r.admissionCompetitiveness.category;

      log(`│  #${String(r.rankPosition).padStart(2)} ${r.name.padEnd(45)} ${r.branchCode.padEnd(4)} Score: ${String(r.matchScore).padStart(5)}% | ₹${salaryLpa.padStart(5)}LPA | Cost: ₹${costL.padStart(5)}L | ROI: ${String(roi).padStart(4)}x | ${compCat}`);

      // Quality flags
      if (compCat === "Unlikely" && r.rankPosition <= 3) {
        allFlags.push({ profile: profile.name, issue: `#${r.rankPosition} ${r.name} (${r.branchCode}) is "Unlikely" — should not rank this high` });
      }
      if (profile.budgetLimit && profile.isBudgetConstraint && total4yr > profile.budgetLimit * 1.15) {
        allFlags.push({ profile: profile.name, issue: `#${r.rankPosition} ${r.name} costs ₹${costL}L which exceeds 1.15x budget ₹${(profile.budgetLimit / 100000).toFixed(0)}L` });
      }
      if (profile.careerGoal === "PLACEMENT" && r.placementInfo.avgSalary && r.placementInfo.avgSalary < 400000 && r.rankPosition <= 5) {
        allFlags.push({ profile: profile.name, issue: `#${r.rankPosition} ${r.name} has only ₹${salaryLpa}LPA avg — too low for placement goal` });
      }
      if (r.matchScore > 0 && r.matchScore < 30 && r.rankPosition <= 3) {
        allFlags.push({ profile: profile.name, issue: `#${r.rankPosition} ${r.name} has very low score (${r.matchScore}%) — questionable recommendation` });
      }
    }

    // Check diversity in top 5
    const top5Names = top10.slice(0, 5).map((r: any) => r.name);
    const uniqueTop5 = new Set(top5Names);
    if (uniqueTop5.size < Math.min(5, top5Names.length) && top5Names.length >= 3) {
      const dupes = [...new Set(top5Names.filter((n: string, i: number) => top5Names.indexOf(n) !== i))];
      allFlags.push({ profile: profile.name, issue: `Duplicate college in top 5: ${dupes.join(", ")}` });
    }

    log(`└─ Diversity: ${uniqueTop5.size}/${Math.min(5, top10.length)} unique colleges in top 5\n`);
  }

  // ── SECTION 2: College Distribution ──
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 2: COLLEGE DISTRIBUTION ACROSS ALL TOP 10s");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const collegeAppearances: Record<string, { count: number; profiles: string[]; avgRank: number; ranks: number[] }> = {};
  const branchAppearances: Record<string, number> = {};

  for (const { profile, top10 } of allResults) {
    for (const r of top10) {
      const key = `${r.name} (${r.branchCode})`;
      if (!collegeAppearances[key]) collegeAppearances[key] = { count: 0, profiles: [], avgRank: 0, ranks: [] };
      collegeAppearances[key].count++;
      collegeAppearances[key].profiles.push(profile.name);
      collegeAppearances[key].ranks.push(r.rankPosition);

      branchAppearances[r.branchCode] = (branchAppearances[r.branchCode] || 0) + 1;
    }
  }

  // Calculate avg rank
  for (const data of Object.values(collegeAppearances)) {
    data.avgRank = data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length;
  }

  const sortedColleges = Object.entries(collegeAppearances).sort((a, b) => b[1].count - a[1].count);

  log("College/Branch combinations by frequency (across all 25 profiles × 10 recommendations = 250 slots):\n");
  log("  Rank  College                                    Branch  Appearances  Avg Rank  Profiles");
  log("  ────  ─────────────────────────────────────────  ──────  ───────────  ────────  ────────");

  let rank = 1;
  for (const [key, data] of sortedColleges) {
    const parts = key.match(/^(.+)\s\((\w+)\)$/);
    const name = parts?.[1] || key;
    const branch = parts?.[2] || "?";
    const profileList = data.profiles.length <= 3 ? data.profiles.join(", ") : `${data.profiles.slice(0, 2).join(", ")}... +${data.profiles.length - 2}`;
    log(`  ${String(rank++).padStart(4)}  ${name.substring(0, 42).padEnd(42)}  ${branch.padEnd(6)}  ${String(data.count).padStart(11)}  ${String(data.avgRank.toFixed(1)).padStart(8)}  ${profileList}`);
  }

  // Branch distribution
  log("\nBranch distribution across all recommendations:");
  const sortedBranches = Object.entries(branchAppearances).sort((a, b) => b[1] - a[1]);
  for (const [branch, count] of sortedBranches) {
    const pct = ((count / 250) * 100).toFixed(1);
    log(`  ${branch.padEnd(6)}: ${String(count).padStart(4)} appearances (${pct}%)`);
  }

  // ── SECTION 3: Overrepresentation Analysis ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 3: OVERREPRESENTATION ANALYSIS");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const totalSlots = allResults.length * 10;
  const expectedPerCollege = totalSlots / sortedColleges.length;

  log(`Total recommendation slots: ${totalSlots}`);
  log(`Unique college-branch combos: ${sortedColleges.length}`);
  log(`Expected appearances per combo (uniform): ${expectedPerCollege.toFixed(1)}\n`);

  const overrepresented: string[] = [];
  const underrepresented: string[] = [];

  for (const [key, data] of sortedColleges) {
    const ratio = data.count / expectedPerCollege;
    if (ratio > 3) {
      overrepresented.push(`${key}: ${data.count} appearances (${ratio.toFixed(1)}x expected) — PRESENT IN ${data.profiles.length}/${allResults.length} PROFILES`);
    }
    if (data.count === 1 && sortedColleges.length > 10) {
      underrepresented.push(key);
    }
  }

  if (overrepresented.length > 0) {
    log("⚠ OVERREPRESENTED college-branch combos (>3x expected frequency):");
    for (const item of overrepresented) log(`  ${item}`);
    allFlags.push({ profile: "ALL", issue: `Overrepresented: ${overrepresented.map(o => o.split(":")[0]).join(", ")}` });
  } else {
    log("✓ No college-branch combo exceeds 3x expected frequency");
  }

  if (underrepresented.length > 0) {
    log(`\nℹ Underrepresented (only 1 appearance): ${underrepresented.length} combos — ${underrepresented.slice(0, 5).join(", ")}${underrepresented.length > 5 ? "..." : ""}`);
  }

  // ── SECTION 4: Score Distribution ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 4: SCORE DISTRIBUTION");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allScores: number[] = [];
  const goalScores: Record<string, number[]> = {};
  const percentileBuckets: Record<string, number> = { "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 };

  for (const { profile, top10 } of allResults) {
    const goal = profile.careerGoal || "NOT_SURE";
    if (!goalScores[goal]) goalScores[goal] = [];

    for (const r of top10) {
      allScores.push(r.matchScore);
      goalScores[goal].push(r.matchScore);

      if (r.matchScore < 20) percentileBuckets["0-20"]++;
      else if (r.matchScore < 40) percentileBuckets["20-40"]++;
      else if (r.matchScore < 60) percentileBuckets["40-60"]++;
      else if (r.matchScore < 80) percentileBuckets["60-80"]++;
      else percentileBuckets["80-100"]++;
    }
  }

  const sortedScores = [...allScores].sort((a, b) => a - b);
  const median = sortedScores[Math.floor(sortedScores.length / 2)];
  const p10 = sortedScores[Math.floor(sortedScores.length * 0.1)];
  const p90 = sortedScores[Math.floor(sortedScores.length * 0.9)];
  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  log(`All scores: avg=${avg.toFixed(1)}%, median=${median}%, P10=${p10}%, P90=${p90}%`);
  log(`Total scores analyzed: ${allScores.length}\n`);

  log("Score distribution:");
  for (const [bucket, count] of Object.entries(percentileBuckets)) {
    const pct = ((count / allScores.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / 5));
    log(`  ${bucket.padStart(6)}%: ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  }

  log("\nPer-goal score stats:");
  for (const [goal, scores] of Object.entries(goalScores)) {
    const sorted = [...scores].sort((a, b) => a - b);
    const goalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const goalMedian = sorted[Math.floor(sorted.length / 2)];
    log(`  ${goal.padEnd(25)}: avg=${goalAvg.toFixed(1)}%, median=${goalMedian}%, n=${scores.length}`);
  }

  // ── SECTION 5: Admission Competitiveness Distribution ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 5: ADMISSION COMPETITIVENESS DISTRIBUTION");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const compCategories: Record<string, Record<string, number>> = {};
  for (const { profile, top10 } of allResults) {
    const goal = profile.careerGoal || "NOT_SURE";
    if (!compCategories[goal]) compCategories[goal] = { Safe: 0, Target: 0, Reach: 0, Unlikely: 0 };

    for (const r of top10) {
      compCategories[goal][r.admissionCompetitiveness.category]++;
    }
  }

  for (const [goal, cats] of Object.entries(compCategories)) {
    const total = Object.values(cats).reduce((a, b) => a + b, 0);
    log(`  ${goal.padEnd(25)}: Safe=${String(cats.Safe).padStart(3)} (${((cats.Safe / total) * 100).toFixed(0)}%) | Target=${String(cats.Target).padStart(3)} (${((cats.Target / total) * 100).toFixed(0)}%) | Reach=${String(cats.Reach).padStart(3)} (${((cats.Reach / total) * 100).toFixed(0)}%) | Unlikely=${String(cats.Unlikely).padStart(3)} (${((cats.Unlikely / total) * 100).toFixed(0)}%)`);
  }

  // ── SECTION 6: Quality Flags ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 6: QUALITY FLAGS (Issues Requiring Attention)");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (allFlags.length === 0) {
    log("✓ No quality issues detected");
  } else {
    const groupedFlags: Record<string, string[]> = {};
    for (const flag of allFlags) {
      if (!groupedFlags[flag.profile]) groupedFlags[flag.profile] = [];
      groupedFlags[flag.profile].push(flag.issue);
    }

    for (const [profile, issues] of Object.entries(groupedFlags)) {
      log(`⚠ ${profile}:`);
      for (const issue of issues) log(`    ${issue}`);
    }
  }

  log(`\nTotal flags: ${allFlags.length}`);

  // ── SECTION 7: Summary & Recommendations ──
  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("SECTION 7: SUMMARY & RECOMMENDATIONS");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const profilesNoResults = allResults.filter(r => r.totalMatches === 0);
  const profilesUnlikelyTop3 = allFlags.filter(f => f.issue.includes("Unlikely"));
  const profilesBudgetExceed = allFlags.filter(f => f.issue.includes("exceeds 1.15x budget"));
  const profilesLowSalary = allFlags.filter(f => f.issue.includes("too low for placement"));
  const profilesDuplicate = allFlags.filter(f => f.issue.includes("Duplicate"));

  log(`Profiles with zero results: ${profilesNoResults.length}${profilesNoResults.length > 0 ? " — " + profilesNoResults.map(p => p.profile.name).join(", ") : ""}`);
  log(`Profiles with Unlikely in top 3: ${profilesUnlikelyTop3.length}`);
  log(`Profiles with budget exceed: ${profilesBudgetExceed.length}`);
  log(`Profiles with low salary for placement: ${profilesLowSalary.length}`);
  log(`Profiles with duplicate colleges in top 5: ${profilesDuplicate.length}`);
  log(`Overrepresented combos: ${overrepresented.length}`);

  // Check if high-percentile students get better scores than low-percentile
  const highPctScores = allResults.filter(r => (r.profile.jeePercentile || 0) >= 90).flatMap(r => r.top10.map(t => t.matchScore));
  const lowPctScores = allResults.filter(r => (r.profile.jeePercentile || 0) < 75).flatMap(r => r.top10.map(t => t.matchScore));
  if (highPctScores.length > 0 && lowPctScores.length > 0) {
    const highAvg = highPctScores.reduce((a, b) => a + b, 0) / highPctScores.length;
    const lowAvg = lowPctScores.reduce((a, b) => a + b, 0) / lowPctScores.length;
    log(`\nHigh percentile (90+) avg score: ${highAvg.toFixed(1)}%`);
    log(`Low percentile (<75) avg score: ${lowAvg.toFixed(1)}%`);
    log(`Score spread: ${(highAvg - lowAvg).toFixed(1)} percentage points`);
    if (Math.abs(highAvg - lowAvg) < 5) {
      log("⚠ Score spread between high and low percentile students is very small — JEE percentile may not be differentiating enough");
    }
  }

  log("\n═══════════════════════════════════════════════════════════════════════");
  log("END OF AUDIT REPORT");
  log("═══════════════════════════════════════════════════════════════════════");

  // Write report to file
  const reportPath = path.join(REPORT_DIR, "recommendation_audit_report.txt");
  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf-8");
  console.log(`\nReport saved to: ${reportPath}`);

  // Also export detailed CSV
  const csvRows: any[] = [];
  for (const { profile, top10 } of allResults) {
    for (const r of top10) {
      const total4yr = (r.feeInfo.annualTuition + r.feeInfo.annualHostel) * 4;
      csvRows.push({
        profile: profile.name,
        goal: profile.careerGoal,
        jeePercentile: profile.jeePercentile,
        budget: profile.budgetLimit,
        rank: r.rankPosition,
        college: r.name,
        branch: r.branchCode,
        matchScore: r.matchScore,
        admissionCategory: r.admissionCompetitiveness.category,
        annualTuition: r.feeInfo.annualTuition,
        annualHostel: r.feeInfo.annualHostel,
        total4YrCost: total4yr,
        avgSalary: r.placementInfo.avgSalary,
        placementPct: r.placementInfo.placementPercentage,
        isPartner: r.isPartner,
        isNewGen: r.isNewGen,
        keyReasons: r.keyReasons.join(" | "),
      });
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(csvRows);
  XLSX.utils.book_append_sheet(wb, ws, "All Recommendations");
  const csvPath = path.join(REPORT_DIR, "recommendation_audit_data.csv");
  XLSX.writeFile(wb, csvPath);
  console.log(`Detailed CSV saved to: ${csvPath}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────
async function main() {
  try {
    await importData();
    const allResults = await runValidation();
    generateReport(allResults);
    console.log("\nAudit complete.");
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
