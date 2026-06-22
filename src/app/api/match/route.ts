import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateRecommendations,
  getWeights,
  StudentProfile,
  CollegeCandidate,
  ScoringConfig,
  CareerGoalType,
} from "@/lib/recommendation";
import { normalizeBranchCode } from "@/lib/branches";

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
      PLACEMENT: { PLACEMENTS: 0.35, ROI: 0.25, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.10, CURRICULUM: 0.15 },
      STARTUP: { PLACEMENTS: 0.15, ROI: 0.15, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.35 },
      HIGHER_STUDIES: { PLACEMENTS: 0.05, ROI: 0.12, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.13, CURRICULUM: 0.55 },
      NOT_SURE: { PLACEMENTS: 0.20, ROI: 0.20, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.20, CURRICULUM: 0.20 },
    },
    priorityAdjustment: { active: true, boostPerRank: 0.10, maxAdjustment: 0.30 },
    careerGoalExtraDimensions: {
      PLACEMENT: [{ key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.10, source: "branch_metadata", computation: "placement_percentage" }],
      STARTUP: [{ key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.10, source: "college_metadata", metadataKey: "startup_ecosystem" }],
      HIGHER_STUDIES: [
        { key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.10, source: "college_metadata", metadataKey: "research_output" },
        { key: "INTERNATIONAL_EXPOSURE", label: "International exposure & exchange programs", weight: 0.05, source: "college_metadata", metadataKey: "international_exposure" },
      ],
      NOT_SURE: [],
    },
    budgetPenalty: { active: true, thresholdMultiplier: 1.3, basePenaltyWeight: 40.0, exponent: 2.0 },
    academicCompetitiveness: {
      active: true, safeThreshold: 5.0, reachThreshold: 0.0, unlikelyThreshold: -5.0,
      reachPenaltyScale: 3.0, unlikelyPenaltyScale: 5.0, excludeLimit: -15.0,
    },
    bonusRules: [
      { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
      { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" },
    ],
    customScoringAttributes: [],
  };
}

function mapCandidate(b: any): CollegeCandidate {
  return {
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
    branchMetadata: b.metadata,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const jeePercentile = body.jeePercentile !== undefined ? body.jeePercentile : body.jee_percentile;
    const class12Percentage = body.class12Percentage !== undefined ? body.class12Percentage : body.class_12_percentage;
    const budgetLimit = body.budgetLimit !== undefined ? body.budgetLimit : body.budget_limit;
    const isBudgetConstraint =
      body.isBudgetConstraint !== undefined
        ? body.isBudgetConstraint
        : body.is_budget_constraint !== undefined
          ? body.is_budget_constraint
          : budgetLimit !== undefined && budgetLimit !== null;
    const restrictLocation =
      body.restrictLocation !== undefined
        ? body.restrictLocation
        : body.restrict_location !== undefined
          ? body.restrict_location
          : false;
    const preferredLocations = body.preferredLocations || body.locations || [];
    const preferredBranches = body.preferredBranches || body.preferred_branches || [];
    const careerGoal: CareerGoalType | undefined =
      body.careerGoal || body.career_goal || undefined;

    let prioritiesInput = body.priorities || [];
    if (prioritiesInput.length === 0) {
      prioritiesInput = [
        { criteria: "PLACEMENTS", rankOrder: 1 },
        { criteria: "CURRICULUM", rankOrder: 2 },
        { criteria: "CAMPUS_LIFE", rankOrder: 3 },
        { criteria: "RESEARCH", rankOrder: 4 },
        { criteria: "EXTRACURRICULARS", rankOrder: 5 },
      ];
    } else {
      prioritiesInput = prioritiesInput.map((p: any, idx: number) => ({
        criteria: (p.criteria || p.id || "").toUpperCase(),
        rankOrder: p.rankOrder !== undefined ? p.rankOrder : p.rank_order !== undefined ? p.rank_order : idx + 1,
      }));
    }

    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    let config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : getDefaultConfig();

    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    let candidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

    if (preferredBranches && preferredBranches.length > 0) {
      const targetBranches = preferredBranches.map((b: string) => normalizeBranchCode(b));
      candidates = candidates.filter((c) => targetBranches.includes(normalizeBranchCode(c.branchCode)));
    }

    const engineProfile: StudentProfile = {
      jeePercentile: jeePercentile !== undefined ? Number(jeePercentile) : null,
      class12Percentage: class12Percentage !== undefined ? Number(class12Percentage) : null,
      budgetLimit: budgetLimit !== undefined && budgetLimit !== null ? Number(budgetLimit) : null,
      isBudgetConstraint: Boolean(isBudgetConstraint),
      restrictLocation: Boolean(restrictLocation),
      preferredLocations: preferredLocations.map((loc: any) => ({ state: loc.state || "", city: loc.city || "" })),
      priorities: prioritiesInput,
      preferredBranches: preferredBranches,
      careerGoal: careerGoal || "NOT_SURE",
    };

    const matches = generateRecommendations(engineProfile, candidates, config);

    return NextResponse.json({ success: true, matches: matches.slice(0, 100) });
  } catch (error: any) {
    console.error("Match API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const jeePercentile = searchParams.get("jeePercentile") || searchParams.get("jee_percentile");
    const class12Percentage = searchParams.get("class12Percentage") || searchParams.get("class_12_percentage");
    const budgetLimit = searchParams.get("budgetLimit") || searchParams.get("budget_limit");
    const isBudgetConstraint = searchParams.get("isBudgetConstraint") === "true" || searchParams.get("is_budget_constraint") === "true" || !!budgetLimit;
    const restrictLocation = searchParams.get("restrictLocation") === "true" || searchParams.get("restrict_location") === "true";
    const careerGoal = (searchParams.get("careerGoal") || searchParams.get("career_goal") || "NOT_SURE") as CareerGoalType;

    const branchesStr = searchParams.get("preferredBranches") || searchParams.get("preferred_branches");
    const preferredBranches = branchesStr ? branchesStr.split(",").map((b) => b.trim()) : [];

    const prioritiesStr = searchParams.get("priorities");
    let prioritiesInput = [];
    if (prioritiesStr) {
      prioritiesInput = prioritiesStr.split(",").map((p, idx) => ({ criteria: p.trim().toUpperCase(), rankOrder: idx + 1 }));
    } else {
      prioritiesInput = [
        { criteria: "PLACEMENTS", rankOrder: 1 },
        { criteria: "CURRICULUM", rankOrder: 2 },
        { criteria: "CAMPUS_LIFE", rankOrder: 3 },
        { criteria: "RESEARCH", rankOrder: 4 },
        { criteria: "EXTRACURRICULARS", rankOrder: 5 },
      ];
    }

    const locationsStr = searchParams.get("preferredLocations") || searchParams.get("locations");
    let preferredLocations = [];
    if (locationsStr) {
      try {
        preferredLocations = JSON.parse(locationsStr);
      } catch {
        preferredLocations = locationsStr.split(",").map((loc) => {
          const parts = loc.split(":");
          return { state: parts[0] || "", city: parts[1] || "" };
        });
      }
    }

    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    let config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : getDefaultConfig();

    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    let candidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

    if (preferredBranches.length > 0) {
      const targetBranches = preferredBranches.map((b: string) => b.toUpperCase());
      candidates = candidates.filter((c) => targetBranches.includes(c.branchCode.toUpperCase()));
    }

    const engineProfile: StudentProfile = {
      jeePercentile: jeePercentile ? Number(jeePercentile) : null,
      class12Percentage: class12Percentage ? Number(class12Percentage) : null,
      budgetLimit: budgetLimit ? Number(budgetLimit) : null,
      isBudgetConstraint: Boolean(isBudgetConstraint),
      restrictLocation: Boolean(restrictLocation),
      preferredLocations: preferredLocations,
      priorities: prioritiesInput,
      preferredBranches: preferredBranches,
      careerGoal: careerGoal || "NOT_SURE",
    };

    const matches = generateRecommendations(engineProfile, candidates, config);

    return NextResponse.json({ success: true, matches: matches.slice(0, 100) });
  } catch (error: any) {
    console.error("Match API GET Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
