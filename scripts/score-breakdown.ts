// Score breakdown script for specific colleges
// Usage: npx tsx scripts/score-breakdown.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  generateRecommendations,
  getWeights,
  StudentProfile,
  CollegeCandidate,
  ScoringConfig,
  CareerGoalType,
  MatchResult,
} from "../src/lib/recommendation";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getDefaultConfig(): ScoringConfig {
  return {
    weightStrategy: "CAREER_GOAL_PRIORITY",
    manualWeights: {
      PLACEMENTS: 0.30,
      ROI: 0.25,
      BRANCH_STRENGTH: 0.20,
      COLLEGE_LIFE: 0.15,
      CURRICULUM: 0.10,
    },
    careerGoalWeights: {
      PLACEMENT: {
        PLACEMENTS: 0.40,
        ROI: 0.20,
        BRANCH_STRENGTH: 0.15,
        COLLEGE_LIFE: 0.10,
        CURRICULUM: 0.15,
      },
      STARTUP: {
        PLACEMENTS: 0.10,
        ROI: 0.10,
        BRANCH_STRENGTH: 0.20,
        COLLEGE_LIFE: 0.15,
        CURRICULUM: 0.45,
      },
      HIGHER_STUDIES: {
        PLACEMENTS: 0.05,
        ROI: 0.12,
        BRANCH_STRENGTH: 0.15,
        COLLEGE_LIFE: 0.13,
        CURRICULUM: 0.55,
      },
      NOT_SURE: {
        PLACEMENTS: 0.20,
        ROI: 0.20,
        BRANCH_STRENGTH: 0.20,
        COLLEGE_LIFE: 0.20,
        CURRICULUM: 0.20,
      },
    },
    priorityAdjustment: {
      active: true,
      boostPerRank: 0.10,
      maxAdjustment: 0.30,
    },
    careerGoalExtraDimensions: {
      PLACEMENT: [
        {
          key: "PLACEMENT_PERCENTAGE",
          label: "Branch placement rate",
          weight: 0.15,
          source: "branch_metadata",
          computation: "placement_percentage",
        },
      ],
      STARTUP: [
        {
          key: "STARTUP_ECOSYSTEM",
          label: "Startup ecosystem & incubation",
          weight: 0.15,
          source: "college_metadata",
          metadataKey: "startup_ecosystem",
        },
      ],
      HIGHER_STUDIES: [
        {
          key: "RESEARCH_OUTPUT",
          label: "Research output & publications",
          weight: 0.10,
          source: "college_metadata",
          metadataKey: "research_output",
        },
        {
          key: "INTERNATIONAL_EXPOSURE",
          label: "International exposure & exchange programs",
          weight: 0.05,
          source: "college_metadata",
          metadataKey: "international_exposure",
        },
      ],
      NOT_SURE: [],
    },
    budgetPenalty: {
      active: true,
      thresholdMultiplier: 1.15,
      basePenaltyWeight: 50,
      exponent: 2.5,
    },
    academicCompetitiveness: {
      active: true,
      safeThreshold: 5.0,
      reachThreshold: 2.0,
      unlikelyThreshold: 0.0,
      reachPenaltyScale: 5,
      unlikelyPenaltyScale: 8,
      excludeLimit: -5.0,
    },
    bonusRules: [
      {
        id: "high_placement",
        type: "PLACEMENT_AVERAGE",
        threshold: 800000,
        bonus: 3,
        reason: "High average salary (≥8 LPA)",
      },
      {
        id: "partner_bonus",
        type: "IS_PARTNER",
        bonus: 2,
        reason: "Partner college — guaranteed application support",
      },
      {
        id: "nirf_bonus",
        type: "CUSTOM_ATTRIBUTE",
        attributeKey: "nirf_ranking",
        threshold: 70,
        bonus: 2,
        reason: "NIRF ranking ≥ 70 — nationally recognized",
      },
    ],
    customScoringAttributes: [
      { key: "nirf_ranking", label: "NIRF Ranking", weight: 0.03, defaultValue: 50 },
      { key: "infra_rating", label: "Infrastructure quality", weight: 0.02, defaultValue: 50 },
    ],
  };
}

async function main() {
  // ─── STUDENT PROFILE ──────────────────────────────────────────
  const student: StudentProfile = {
    jeePercentile: 95.0,
    class12Percentage: 88.0,
    budgetLimit: 1200000,
    isBudgetConstraint: true,
    restrictLocation: false,
    preferredLocations: [],
    priorities: [
      { criteria: "PLACEMENTS", rankOrder: 1 },
      { criteria: "ROI", rankOrder: 2 },
      { criteria: "BRANCH_STRENGTH", rankOrder: 3 },
      { criteria: "CURRICULUM", rankOrder: 4 },
      { criteria: "COLLEGE_LIFE", rankOrder: 5 },
    ],
    preferredBranches: ["CSE"],
    careerGoal: "PLACEMENT" as CareerGoalType,
  };

  const config = getDefaultConfig();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SCORE BREAKDOWN: NIT Warangal CSE vs VIT Vellore CSE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n── Student Profile ──");
  console.log(`  JEE Percentile:    ${student.jeePercentile}`);
  console.log(`  Class 12:          ${student.class12Percentage}%`);
  console.log(`  Budget (4yr):      ₹${(student.budgetLimit! / 100000).toFixed(0)}L (${student.isBudgetConstraint ? "constrained" : "flexible"})`);
  console.log(`  Career Goal:       ${student.careerGoal}`);
  console.log(`  Top Priority:      ${student.priorities[0].criteria}`);
  console.log(`  Branches:          ${student.preferredBranches.join(", ")}`);

  // ─── WEIGHTS ──────────────────────────────────────────────────
  const weights = getWeights(student.priorities, config, student.careerGoal);

  console.log("\n── Final Weights (after career goal + priority adjustment) ──");
  Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, val]) => {
      console.log(`  ${key.padEnd(25)} ${(val * 100).toFixed(2)}%`);
    });

  // ─── LOAD CANDIDATES ──────────────────────────────────────────
  const dbBranches = await prisma.collegeBranch.findMany({
    include: { college: true },
  });

  const candidates: CollegeCandidate[] = dbBranches.map((b) => ({
    id: b.college.id,
    name: b.college.name,
    slug: b.college.slug,
    state: b.college.state,
    city: b.college.city,
    logoUrl: b.college.logoUrl,
    coverImageUrl: b.college.coverImageUrl,
    brochureUrl: b.college.brochureUrl,
    officialApplyUrl: b.college.officialApplyUrl,
    website: b.college.website,
    isPartner: b.college.isPartner,
    isNewGen: b.college.isNewGen,
    commissionRate: b.college.commissionRate,
    placementScore: b.college.placementScore,
    collegeLifeScore: b.college.collegeLifeScore,
    curriculumScore: b.college.curriculumScore,
    metadata: b.college.metadata,
    branchId: b.id,
    branchName: b.branchName,
    branchCode: b.branchCode,
    tuitionFeeAnnual: b.tuitionFeeAnnual,
    hostelFeeAnnual: b.hostelFeeAnnual,
    seatCapacity: b.seatCapacity,
    avgSalary: b.avgSalary,
    medianSalary: b.medianSalary,
    highestSalary: b.highestSalary,
    minJeePercentileCutoff: b.minJeePercentileCutoff,
    minClass12Cutoff: b.minClass12Cutoff,
    branchStrengthScore: b.branchStrengthScore,
    placementPercentage: b.placementPercentage,
    branchMetadata: null,
  }));

  // ─── RUN ENGINE ───────────────────────────────────────────────
  const results = generateRecommendations(student, candidates, config);

  // ─── FIND TARGET COLLEGES ─────────────────────────────────────
  const nitWarangal = results.find(
    (r) => r.name === "NIT Warangal" && r.branchCode === "CSE"
  );
  const vitVellore = results.find(
    (r) => r.name === "Vellore Institute of Technology" && r.branchCode === "CSE"
  );

  function printBreakdown(label: string, result: MatchResult | undefined) {
    if (!result) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`  ${label}: NOT FOUND in results`);
      return;
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${label}`);
    console.log(`${"═".repeat(60)}`);

    console.log(`\n  Final Score:           ${result.matchScore.toFixed(2)}`);
    console.log(`  Rank Position:         #${result.rankPosition}`);
    console.log(`  Admission Category:    ${result.admissionCompetitiveness.category} — ${result.admissionCompetitiveness.badgeText}`);

    console.log(`\n  ── Fee Structure ──`);
    console.log(`    Tuition (annual):    ₹${(result.feeInfo.annualTuition / 100000).toFixed(2)}L`);
    console.log(`    Hostel (annual):     ₹${(result.feeInfo.annualHostel / 100000).toFixed(2)}L`);
    console.log(`    Total 4-year cost:   ₹${(result.feeInfo.total4YrCost / 100000).toFixed(2)}L`);

    console.log(`\n  ── Placement Info ──`);
    console.log(`    Avg Salary:          ${result.placementInfo.avgSalary ? `₹${(result.placementInfo.avgSalary / 100000).toFixed(2)}L` : "N/A"}`);
    console.log(`    Median Salary:       ${result.placementInfo.medianSalary ? `₹${(result.placementInfo.medianSalary / 100000).toFixed(2)}L` : "N/A"}`);
    console.log(`    Highest Salary:      ${result.placementInfo.highestSalary ? `₹${(result.placementInfo.highestSalary / 100000).toFixed(2)}L` : "N/A"}`);
    console.log(`    Placement Rate:      ${result.placementInfo.placementPercentage ?? "N/A"}%`);

    console.log(`\n  ── Score Breakdown ──`);
    console.log(`    Base Score:          ${result.scoreBreakdown.baseScore.toFixed(2)}`);

    console.log(`\n    Factor Contributions:`);
    console.log(`    ${"Factor".padEnd(28)} ${"Score".padStart(7)} ${"Weight".padStart(9)} ${"Contrib".padStart(10)}`);
    console.log(`    ${"─".repeat(55)}`);
    for (const fc of result.scoreBreakdown.factorContributions) {
      console.log(
        `    ${fc.label.padEnd(28)} ${String(fc.score).padStart(7)} ${(fc.weight * 100).toFixed(1).padStart(8)}% ${String(fc.contribution.toFixed(1)).padStart(10)}`
      );
    }

    if (result.scoreBreakdown.appliedBonuses.length > 0) {
      console.log(`\n    Bonuses Applied:`);
      for (const b of result.scoreBreakdown.appliedBonuses) {
        console.log(`      +${b.value}  ${b.reason}`);
      }
    } else {
      console.log(`\n    Bonuses Applied:     None`);
    }

    if (result.scoreBreakdown.appliedPenalties.length > 0) {
      console.log(`\n    Penalties Applied:`);
      for (const p of result.scoreBreakdown.appliedPenalties) {
        console.log(`      -${p.value}  ${p.reason}`);
      }
    } else {
      console.log(`\n    Penalties Applied:   None`);
    }

    const bonusTotal = result.scoreBreakdown.appliedBonuses.reduce((s, b) => s + b.value, 0);
    const penaltyTotal = result.scoreBreakdown.appliedPenalties.reduce((s, p) => s + p.value, 0);
    console.log(`\n    Bonus Total:         +${bonusTotal}`);
    console.log(`    Penalty Total:       -${penaltyTotal}`);
    console.log(`    Final Score:         ${result.scoreBreakdown.finalScore.toFixed(2)}`);

    if (result.keyReasons.length > 0) {
      console.log(`\n  ── Key Reasons ──`);
      for (const r of result.keyReasons) {
        console.log(`    • ${r}`);
      }
    }
  }

  printBreakdown("NIT Warangal — CSE", nitWarangal);
  printBreakdown("VIT Vellore — CSE", vitVellore);

  // ─── SIDE-BY-SIDE COMPARISON ──────────────────────────────────
  if (nitWarangal && vitVellore) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  SIDE-BY-SIDE COMPARISON`);
    console.log(`${"═".repeat(60)}`);

    const n = nitWarangal;
    const v = vitVellore;

    console.log(`\n  ${"Metric".padEnd(30)} ${"NIT Warangal".padStart(15)} ${"VIT Vellore".padStart(15)} ${"Delta".padStart(10)}`);
    console.log(`  ${"─".repeat(70)}`);

    console.log(`  ${"Final Score".padEnd(30)} ${n.matchScore.toFixed(2).padStart(15)} ${v.matchScore.toFixed(2).padStart(15)} ${(v.matchScore - n.matchScore >= 0 ? "+" : "") + (v.matchScore - n.matchScore).toFixed(2).padStart(10)}`);
    console.log(`  ${"Rank".padEnd(30)} ${`#${n.rankPosition}`.padStart(15)} ${`#${v.rankPosition}`.padStart(15)}`);

    console.log(`  ${"Tuition (annual)".padEnd(30)} ${`₹${(n.feeInfo.annualTuition / 100000).toFixed(1)}L`.padStart(15)} ${`₹${(v.feeInfo.annualTuition / 100000).toFixed(1)}L`.padStart(15)}`);
    console.log(`  ${"Total 4yr Cost".padEnd(30)} ${`₹${(n.feeInfo.total4YrCost / 100000).toFixed(1)}L`.padStart(15)} ${`₹${(v.feeInfo.total4YrCost / 100000).toFixed(1)}L`.padStart(15)}`);
    console.log(`  ${"Avg Salary".padEnd(30)} ${`₹${((n.placementInfo.avgSalary || 0) / 100000).toFixed(1)}L`.padStart(15)} ${`₹${((v.placementInfo.avgSalary || 0) / 100000).toFixed(1)}L`.padStart(15)}`);
    console.log(`  ${"Placement Rate".padEnd(30)} ${`${n.placementInfo.placementPercentage ?? "N/A"}%`.padStart(15)} ${`${v.placementInfo.placementPercentage ?? "N/A"}%`.padStart(15)}`);
    console.log(`  ${"Admission".padEnd(30)} ${n.admissionCompetitiveness.category.padStart(15)} ${v.admissionCompetitiveness.category.padStart(15)}`);

    console.log(`\n  Factor-by-Factor Delta (VIT - NIT):`);
    const nFactors = new Map(n.scoreBreakdown.factorContributions.map((f) => [f.factor, f.contribution]));
    for (const vf of v.scoreBreakdown.factorContributions) {
      const nc = nFactors.get(vf.factor) || 0;
      const delta = vf.contribution - nc;
      const sign = delta >= 0 ? "+" : "";
      console.log(`    ${vf.label.padEnd(28)} ${sign}${delta.toFixed(1)}`);
    }

    console.log(`\n  Why VIT outranked NIT Warangal:`);

    // Find the biggest positive delta factors
    const deltas: { factor: string; label: string; delta: number }[] = [];
    for (const vf of v.scoreBreakdown.factorContributions) {
      const nc = nFactors.get(vf.factor) || 0;
      deltas.push({ factor: vf.factor, label: vf.label, delta: vf.contribution - nc });
    }
    deltas.sort((a, b) => b.delta - a.delta);

    for (const d of deltas.filter((x) => x.delta > 0)) {
      console.log(`    ✓ +${d.delta.toFixed(1)} from ${d.label}`);
    }
    for (const d of deltas.filter((x) => x.delta < 0)) {
      console.log(`    ✗ ${d.delta.toFixed(1)} from ${d.label}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
