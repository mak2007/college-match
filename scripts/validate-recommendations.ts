import "dotenv/config";
import * as XLSX from "xlsx";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateRecommendations, StudentProfile, CollegeCandidate, ScoringConfig } from "../src/lib/recommendation";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ─── STEP 1: Import colleges from XLSX ───────────────────────────────
async function importData() {
  console.log("=== STEP 1: Importing college data from XLSX ===\n");

  const collegeWb = XLSX.readFile(path.join(TEMPLATES_DIR, "colleges_20_sample.xlsx"));
  const collegeRows = XLSX.utils.sheet_to_json(collegeWb.Sheets[collegeWb.SheetNames[0]]);
  console.log(`Read ${collegeRows.length} colleges from XLSX`);

  const branchWb = XLSX.readFile(path.join(TEMPLATES_DIR, "branches_20_sample.xlsx"));
  const branchRows = XLSX.utils.sheet_to_json(branchWb.Sheets[branchWb.SheetNames[0]]);
  console.log(`Read ${branchRows.length} branches from XLSX`);

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
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      },
      create: {
        name, slug, state: String(r.state || ""), city: String(r.city || ""),
        placementScore: Number(r.placementScore || 0),
        collegeLifeScore: Number(r.collegeLifeScore || 0),
        curriculumScore: Number(r.curriculumScore || 0),
        officialApplyUrl: String(r.officialApplyUrl || "https://example.com"),
        isPartner: Boolean(r.isPartner),
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

// ─── STEP 2: Define test profiles ─────────────────────────────────────
function getTestProfiles(): (StudentProfile & { name: string })[] {
  return [
    {
      name: "Top-tier CSE Placement",
      jeePercentile: 98, class12Percentage: 95, budgetLimit: 2000000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "Mid-tier CSE Placement",
      jeePercentile: 88, class12Percentage: 82, budgetLimit: 1500000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "Low-tier CSE Budget",
      jeePercentile: 72, class12Percentage: 75, budgetLimit: 800000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "roi", rankOrder: 1 }, { criteria: "placements", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 }, { criteria: "college_life", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 },
      ],
    },
    {
      name: "ECE Placement Focus",
      jeePercentile: 92, class12Percentage: 88, budgetLimit: 1800000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["ECE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "roi", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "Mechanical Placement",
      jeePercentile: 85, class12Percentage: 80, budgetLimit: 1200000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["ME"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 }, { criteria: "college_life", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 },
      ],
    },
    {
      name: "Startup Dreamer (CSE)",
      jeePercentile: 90, class12Percentage: 85, budgetLimit: 2000000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "STARTUP",
      priorities: [
        { criteria: "curriculum", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "college_life", rankOrder: 3 }, { criteria: "placements", rankOrder: 4 },
        { criteria: "roi", rankOrder: 5 },
      ],
    },
    {
      name: "Higher Studies India (ECE)",
      jeePercentile: 94, class12Percentage: 90, budgetLimit: 1600000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["ECE"],
      careerGoal: "HIGHER_STUDIES_INDIA",
      priorities: [
        { criteria: "curriculum", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "placements", rankOrder: 3 }, { criteria: "roi", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "Higher Studies Abroad (CSE)",
      jeePercentile: 96, class12Percentage: 92, budgetLimit: 2500000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "HIGHER_STUDIES_ABROAD",
      priorities: [
        { criteria: "curriculum", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "college_life", rankOrder: 3 }, { criteria: "placements", rankOrder: 4 },
        { criteria: "roi", rankOrder: 5 },
      ],
    },
    {
      name: "Govt Exams (Mechanical)",
      jeePercentile: 80, class12Percentage: 78, budgetLimit: 1000000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["ME"],
      careerGoal: "GOVERNMENT_EXAMS",
      priorities: [
        { criteria: "roi", rankOrder: 1 }, { criteria: "placements", rankOrder: 2 },
        { criteria: "college_life", rankOrder: 3 }, { criteria: "branch_strength", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 },
      ],
    },
    {
      name: "Not Sure (Multi-branch)",
      jeePercentile: 86, class12Percentage: 83, budgetLimit: 1400000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE", "ECE", "IT"],
      careerGoal: "NOT_SURE",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "curriculum", rankOrder: 3 }, { criteria: "branch_strength", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "South India Only (CSE)",
      jeePercentile: 91, class12Percentage: 87, budgetLimit: 1600000, isBudgetConstraint: true,
      restrictLocation: true,
      preferredLocations: [{ state: "Karnataka", city: "" }, { state: "Tamil Nadu", city: "" }],
      preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 }, { criteria: "curriculum", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "No Budget Constraint (CSE)",
      jeePercentile: 95, class12Percentage: 91, budgetLimit: null, isBudgetConstraint: false,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "curriculum", rankOrder: 3 }, { criteria: "college_life", rankOrder: 4 },
        { criteria: "roi", rankOrder: 5 },
      ],
    },
    {
      name: "Civil Engineering (Budget)",
      jeePercentile: 75, class12Percentage: 70, budgetLimit: 800000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "roi", rankOrder: 1 }, { criteria: "placements", rankOrder: 2 },
        { criteria: "college_life", rankOrder: 3 }, { criteria: "branch_strength", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 },
      ],
    },
    {
      name: "IT Startup (Low Budget)",
      jeePercentile: 82, class12Percentage: 79, budgetLimit: 900000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["IT"],
      careerGoal: "STARTUP",
      priorities: [
        { criteria: "curriculum", rankOrder: 1 }, { criteria: "roi", rankOrder: 2 },
        { criteria: "placements", rankOrder: 3 }, { criteria: "branch_strength", rankOrder: 4 },
        { criteria: "college_life", rankOrder: 5 },
      ],
    },
    {
      name: "Extreme Reach (99 percentile)",
      jeePercentile: 99, class12Percentage: 97, budgetLimit: 3000000, isBudgetConstraint: true,
      restrictLocation: false, preferredLocations: [], preferredBranches: ["CSE"],
      careerGoal: "PLACEMENT",
      priorities: [
        { criteria: "placements", rankOrder: 1 }, { criteria: "branch_strength", rankOrder: 2 },
        { criteria: "curriculum", rankOrder: 3 }, { criteria: "college_life", rankOrder: 4 },
        { criteria: "roi", rankOrder: 5 },
      ],
    },
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
  console.log(`\n=== STEP 2: Running ${profiles.length} test profiles against ${candidates.length} candidates ===\n`);

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

// ─── STEP 4: Export results ────────────────────────────────────────────
function exportResults(allResults: { profile: any; top10: any[]; totalMatches: number }[]) {
  console.log("=== STEP 3: Recommendation Results ===\n");

  const summaryRows: any[] = [];
  for (const { profile, top10, totalMatches } of allResults) {
    console.log(`\n── ${profile.name} ──`);
    console.log(`   Goal: ${profile.careerGoal} | JEE: ${profile.jeePercentile} | Budget: ${profile.budgetLimit ? "₹" + (profile.budgetLimit / 100000) + "L" : "No limit"} | Branches: ${profile.preferredBranches.join(",")}`);
    console.log(`   Total matches: ${totalMatches} | Top 10:`);

    for (const r of top10) {
      const total4yr = (r.feeInfo.annualTuition + r.feeInfo.annualHostel) * 4;
      const roi = r.placementInfo.avgSalary ? (r.placementInfo.avgSalary / total4yr).toFixed(1) : "N/A";
      console.log(`   #${r.rankPosition} ${r.name} (${r.branchCode}) — Score: ${r.matchScore}% | ₹${(r.placementInfo.avgSalary / 100000).toFixed(1)}LPA | Cost: ₹${(total4yr / 100000).toFixed(1)}L | ROI: ${roi}x | ${r.admissionCompetitiveness.category}`);
      console.log(`      Reasons: ${r.keyReasons.join(" | ")}`);
    }

    summaryRows.push({
      profile: profile.name, goal: profile.careerGoal, jee: profile.jeePercentile,
      budget: profile.budgetLimit, branches: profile.preferredBranches.join(","), totalMatches,
      top1: top10[0] ? `${top10[0].name} (${top10[0].branchCode}) ${top10[0].matchScore}%` : "none",
      top2: top10[1] ? `${top10[1].name} (${top10[1].branchCode}) ${top10[1].matchScore}%` : "none",
      top3: top10[2] ? `${top10[2].name} (${top10[2].branchCode}) ${top10[2].matchScore}%` : "none",
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws, "Summary");
  const outPath = path.join(TEMPLATES_DIR, "validation_results.csv");
  XLSX.writeFile(wb, outPath);
  console.log(`\n\nResults exported to: ${outPath}`);
}

// ─── STEP 5: Identify quality issues ──────────────────────────────────
function analyzeQuality(allResults: { profile: any; top10: any[] }[]) {
  console.log("\n\n=== STEP 4: Quality Analysis ===\n");

  const issues: string[] = [];
  const factorWeights: Record<string, { totalWeight: number; count: number; totalContribution: number }> = {};

  // Per-goal tracking
  const goalStats: Record<string, { topColleges: string[]; avgScores: number[]; factorAvgs: Record<string, number[]> }> = {};

  for (const { profile, top10 } of allResults) {
    const goal = profile.careerGoal || "NOT_SURE";
    if (!goalStats[goal]) goalStats[goal] = { topColleges: [], avgScores: [], factorAvgs: {} };

    if (top10.length > 0) {
      const top = top10[0];
      const total4yr = (top.feeInfo.annualTuition + top.feeInfo.annualHostel) * 4;

      goalStats[goal].topColleges.push(top.name);
      goalStats[goal].avgScores.push(top.matchScore);

      if (profile.budgetLimit && profile.budgetLimit > 2000000 && total4yr < 500000) {
        issues.push(`${profile.name}: Top result costs ₹${(total4yr / 100000).toFixed(1)}L but budget is ₹${(profile.budgetLimit / 100000).toFixed(1)}L — suspiciously cheap`);
      }
      if (profile.careerGoal === "PLACEMENT" && top.placementInfo.avgSalary && top.placementInfo.avgSalary < 500000) {
        issues.push(`${profile.name}: Placement goal but top result has only ₹${(top.placementInfo.avgSalary / 100000).toFixed(1)}LPA avg`);
      }
      if (top.admissionCompetitiveness.category === "Unlikely") {
        issues.push(`${profile.name}: Top result is "Unlikely" — should not be #1`);
      }
      if (profile.budgetLimit && profile.isBudgetConstraint && total4yr > profile.budgetLimit * 1.15) {
        issues.push(`${profile.name}: Top result ₹${(total4yr / 100000).toFixed(1)}L exceeds 1.15x budget ₹${(profile.budgetLimit / 100000).toFixed(1)}L`);
      }
      // Check if same college appears multiple times in top 5
      const top5Names = top10.slice(0, 5).map((r: any) => r.name);
      const uniqueColleges = new Set(top5Names);
      if (uniqueColleges.size < top5Names.length) {
        const dupes = top5Names.filter((n: string, i: number) => top5Names.indexOf(n) !== i);
        issues.push(`${profile.name}: Duplicate colleges in top 5: ${[...new Set(dupes)].join(", ")}`);
      }
      // Diversity metric: unique colleges in top 5
      console.log(`   ${profile.name}: ${uniqueColleges.size} unique colleges in top 5 (diversity: ${(uniqueColleges.size / Math.min(5, top10.length) * 100).toFixed(0)}%)`);

      // Track factor contributions per goal
      if (top.scoreBreakdown?.factorContributions) {
        for (const fc of top.scoreBreakdown.factorContributions) {
          if (!goalStats[goal].factorAvgs[fc.factor]) goalStats[goal].factorAvgs[fc.factor] = [];
          goalStats[goal].factorAvgs[fc.factor].push(fc.contribution);
        }
      }
    }

    for (const r of top10) {
      if (r.scoreBreakdown?.factorContributions) {
        for (const fc of r.scoreBreakdown.factorContributions) {
          if (!factorWeights[fc.factor]) factorWeights[fc.factor] = { totalWeight: 0, count: 0, totalContribution: 0 };
          factorWeights[fc.factor].totalWeight += fc.weight;
          factorWeights[fc.factor].totalContribution += fc.contribution;
          factorWeights[fc.factor].count++;
        }
      }
    }
  }

  console.log("\n── Issues Found ──");
  if (issues.length === 0) {
    console.log("   None detected.");
  } else {
    for (const issue of issues) console.log(`   ⚠ ${issue}`);
  }

  console.log("\n── Average Factor Weights (across all recommendations) ──");
  const factorEntries = Object.entries(factorWeights)
    .map(([factor, data]) => ({
      factor,
      avgWeight: data.totalWeight / data.count,
      avgContribution: data.totalContribution / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgWeight - a.avgWeight);

  for (const f of factorEntries) {
    console.log(`   ${f.factor}: weight=${(f.avgWeight * 100).toFixed(1)}%, avgContribution=${f.avgContribution.toFixed(1)}`);
  }

  // Per-goal analysis
  console.log("\n── Per-Goal Top College Distribution ──");
  for (const [goal, stats] of Object.entries(goalStats)) {
    const counts: Record<string, number> = {};
    for (const name of stats.topColleges) counts[name] = (counts[name] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const avgScore = stats.avgScores.length > 0 ? (stats.avgScores.reduce((a, b) => a + b, 0) / stats.avgScores.length).toFixed(1) : "N/A";
    console.log(`   ${goal}: avgScore=${avgScore}, top picks: ${sorted.slice(0, 3).map(([n, c]) => `${n}(${c})`).join(", ")}`);

    // Show factor contribution spread for this goal
    console.log(`     Factor contributions (avg):`);
    for (const [factor, contribs] of Object.entries(stats.factorAvgs)) {
      const avg = contribs.reduce((a, b) => a + b, 0) / contribs.length;
      console.log(`       ${factor}: ${avg.toFixed(1)}`);
    }
  }

  return { issues, factorEntries };
}

// ─── MAIN ─────────────────────────────────────────────────────────────
async function main() {
  try {
    await importData();
    const allResults = await runValidation();
    exportResults(allResults);
    const analysis = analyzeQuality(allResults);

    console.log("\n\n=== DONE ===");
    console.log(`Tested ${allResults.length} profiles`);
    console.log(`Issues found: ${analysis.issues.length}`);
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
