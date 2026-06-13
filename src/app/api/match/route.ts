import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRecommendations, StudentProfile, CollegeCandidate, ScoringConfig } from "@/lib/recommendation";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support both camelCase and snake_case input mappings
    const jeePercentile = body.jeePercentile !== undefined ? body.jeePercentile : body.jee_percentile;
    const class12Percentage = body.class12Percentage !== undefined ? body.class12Percentage : body.class_12_percentage;
    const budgetLimit = body.budgetLimit !== undefined ? body.budgetLimit : body.budget_limit;
    const isBudgetConstraint = body.isBudgetConstraint !== undefined 
      ? body.isBudgetConstraint 
      : body.is_budget_constraint !== undefined 
        ? body.is_budget_constraint 
        : budgetLimit !== undefined && budgetLimit !== null;
    const restrictLocation = body.restrictLocation !== undefined 
      ? body.restrictLocation 
      : body.restrict_location !== undefined 
        ? body.restrict_location 
        : false;
    const preferredLocations = body.preferredLocations || body.locations || [];
    const preferredBranches = body.preferredBranches || body.preferred_branches || [];
    const careerGoal = body.careerGoal || body.career_goal || null;
    
    // Priorities list mapping - if empty or missing, provide a standard default rank order
    let prioritiesInput = body.priorities || [];
    if (prioritiesInput.length === 0) {
      prioritiesInput = [
        { criteria: "placements", rankOrder: 1 },
        { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 },
        { criteria: "college_life", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 }
      ];
    } else {
      // Normalize priorities criteria to lowercase for matching and ensure camelCase/snake_case mapping
      prioritiesInput = prioritiesInput.map((p: any, idx: number) => ({
        criteria: (p.criteria || p.id || "").toLowerCase(),
        rankOrder: p.rankOrder !== undefined ? p.rankOrder : p.rank_order !== undefined ? p.rank_order : idx + 1
      }));
    }

    // 1. Fetch the active Matching Configuration from Database
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: "matching_rules" },
    });

    let config: ScoringConfig;
    if (dbConfig) {
      config = JSON.parse(dbConfig.value);
    } else {
      // Fallback default configurations
      config = {
        weightStrategy: "ROC",
        manualWeights: {
          PLACEMENTS: 0.30,
          ROI: 0.25,
          BRANCH_STRENGTH: 0.20,
          COLLEGE_LIFE: 0.15,
          CURRICULUM: 0.10,
        },
        budgetPenalty: {
          active: true,
          thresholdMultiplier: 1.3,
          basePenaltyWeight: 40.0,
          exponent: 2.0,
        },
        academicCompetitiveness: {
          active: true,
          safeThreshold: 5.0,
          reachThreshold: 0.0,
          unlikelyThreshold: -5.0,
          reachPenaltyScale: 3.0,
          unlikelyPenaltyScale: 5.0,
          excludeLimit: -15.0,
        },
        bonusRules: [
          { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
          { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" }
        ],
        customScoringAttributes: []
      };
    }

    // 2. Fetch all colleges and branches from database
    const dbBranches = await prisma.collegeBranch.findMany({
      include: {
        college: true,
      },
    });

    // Map database structures to recommendation engine candidates
    let candidates: CollegeCandidate[] = dbBranches.map((b) => ({
      id: b.college.id,
      name: b.college.name,
      slug: b.college.slug,
      state: b.college.state,
      city: b.college.city,
      logoUrl: b.college.logoUrl,
      coverImageUrl: b.college.coverImageUrl,
      brochureUrl: b.college.brochureUrl,
      officialApplyUrl: b.college.officialApplyUrl,
      isPartner: b.college.isPartner,
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
      branchMetadata: b.metadata,
    }));

    // Filter by branch code if specific branches were selected
    if (preferredBranches && preferredBranches.length > 0) {
      const targetBranches = preferredBranches.map((b: string) => b.toUpperCase());
      candidates = candidates.filter((c) =>
        targetBranches.includes(c.branchCode.toUpperCase())
      );
    }

    // 3. Construct engine student profile input
    const engineProfile: StudentProfile = {
      jeePercentile: jeePercentile !== undefined ? Number(jeePercentile) : null,
      class12Percentage: class12Percentage !== undefined ? Number(class12Percentage) : null,
      budgetLimit: budgetLimit !== undefined && budgetLimit !== null ? Number(budgetLimit) : null,
      isBudgetConstraint: Boolean(isBudgetConstraint),
      restrictLocation: Boolean(restrictLocation),
      preferredLocations: preferredLocations.map((loc: any) => ({
        state: loc.state || "",
        city: loc.city || ""
      })),
      priorities: prioritiesInput,
      preferredBranches: preferredBranches,
      careerGoal: careerGoal,
    };

    // 4. Run Configurable Recommendation Scoring Engine
    const matches = generateRecommendations(engineProfile, candidates, config);

    // Return the matches directly (e.g. top 10 or all depending on preference, default to top 10)
    return NextResponse.json({
      success: true,
      matches: matches.slice(0, 10),
    });

  } catch (error: any) {
    console.error("Match API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const jeePercentile = searchParams.get("jeePercentile") || searchParams.get("jee_percentile");
    const class12Percentage = searchParams.get("class12Percentage") || searchParams.get("class_12_percentage");
    const budgetLimit = searchParams.get("budgetLimit") || searchParams.get("budget_limit");
    const isBudgetConstraint = searchParams.get("isBudgetConstraint") === "true" || searchParams.get("is_budget_constraint") === "true" || !!budgetLimit;
    const restrictLocation = searchParams.get("restrictLocation") === "true" || searchParams.get("restrict_location") === "true";
    const careerGoal = searchParams.get("careerGoal") || searchParams.get("career_goal");
    
    // Parse preferred branches (comma-separated list)
    const branchesStr = searchParams.get("preferredBranches") || searchParams.get("preferred_branches");
    const preferredBranches = branchesStr ? branchesStr.split(",").map(b => b.trim()) : [];

    // Parse priorities (comma-separated list in rank order, e.g. "placements,roi,college_life")
    const prioritiesStr = searchParams.get("priorities");
    let prioritiesInput = [];
    if (prioritiesStr) {
      prioritiesInput = prioritiesStr.split(",").map((p, idx) => ({
        criteria: p.trim().toLowerCase(),
        rankOrder: idx + 1
      }));
    } else {
      prioritiesInput = [
        { criteria: "placements", rankOrder: 1 },
        { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 },
        { criteria: "college_life", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 }
      ];
    }

    // Parse preferred locations (format: "state1:city1,state2:city2" or JSON format)
    const locationsStr = searchParams.get("preferredLocations") || searchParams.get("locations");
    let preferredLocations = [];
    if (locationsStr) {
      try {
        // Try to parse as JSON first
        preferredLocations = JSON.parse(locationsStr);
      } catch {
        // Fallback to comma/colon separated format
        preferredLocations = locationsStr.split(",").map(loc => {
          const parts = loc.split(":");
          return {
            state: parts[0] || "",
            city: parts[1] || ""
          };
        });
      }
    }

    // 1. Fetch system configs
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: "matching_rules" },
    });

    let config: ScoringConfig;
    if (dbConfig) {
      config = JSON.parse(dbConfig.value);
    } else {
      config = {
        weightStrategy: "ROC",
        manualWeights: {
          PLACEMENTS: 0.30,
          ROI: 0.25,
          BRANCH_STRENGTH: 0.20,
          COLLEGE_LIFE: 0.15,
          CURRICULUM: 0.10,
        },
        budgetPenalty: {
          active: true,
          thresholdMultiplier: 1.3,
          basePenaltyWeight: 40.0,
          exponent: 2.0,
        },
        academicCompetitiveness: {
          active: true,
          safeThreshold: 5.0,
          reachThreshold: 0.0,
          unlikelyThreshold: -5.0,
          reachPenaltyScale: 3.0,
          unlikelyPenaltyScale: 5.0,
          excludeLimit: -15.0,
        },
        bonusRules: [
          { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
          { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" }
        ],
        customScoringAttributes: []
      };
    }

    // 2. Fetch candidates
    const dbBranches = await prisma.collegeBranch.findMany({
      include: {
        college: true,
      },
    });

    let candidates: CollegeCandidate[] = dbBranches.map((b) => ({
      id: b.college.id,
      name: b.college.name,
      slug: b.college.slug,
      state: b.college.state,
      city: b.college.city,
      logoUrl: b.college.logoUrl,
      coverImageUrl: b.college.coverImageUrl,
      brochureUrl: b.college.brochureUrl,
      officialApplyUrl: b.college.officialApplyUrl,
      isPartner: b.college.isPartner,
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
      branchMetadata: b.metadata,
    }));

    if (preferredBranches.length > 0) {
      const targetBranches = preferredBranches.map((b: string) => b.toUpperCase());
      candidates = candidates.filter((c) =>
        targetBranches.includes(c.branchCode.toUpperCase())
      );
    }

    // 3. Run engine
    const engineProfile: StudentProfile = {
      jeePercentile: jeePercentile ? Number(jeePercentile) : null,
      class12Percentage: class12Percentage ? Number(class12Percentage) : null,
      budgetLimit: budgetLimit ? Number(budgetLimit) : null,
      isBudgetConstraint: Boolean(isBudgetConstraint),
      restrictLocation: Boolean(restrictLocation),
      preferredLocations: preferredLocations,
      priorities: prioritiesInput,
      preferredBranches: preferredBranches,
      careerGoal: careerGoal,
    };

    const matches = generateRecommendations(engineProfile, candidates, config);

    return NextResponse.json({
      success: true,
      matches: matches.slice(0, 10),
    });

  } catch (error: any) {
    console.error("Match API GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
