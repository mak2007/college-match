import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import {
  generateRecommendations,
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

/**
 * POST /api/recommendations/regenerate
 *
 * Called from the results page sidebar when the user modifies quiz answers.
 * Updates student record, re-runs the engine, stores new recommendations,
 * and returns them.
 *
 * Body: {
 *   studentId: string,
 *   quizData: {
 *     careerGoal: string,
 *     jeePercentile: number | null,
 *     class12Percentage: number | null,
 *     budgetLimit: number | null,
 *     isBudgetConstraint: boolean,
 *     restrictLocation: boolean,
 *     selectedLocations: Array<{ state: string; city: string }>,
 *     priorities: Array<{ criteria: string; rankOrder: number }>,
 *     preferredBranches: string[],
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, quizData } = body;

    if (!studentId || !quizData) {
      return NextResponse.json({ error: "Missing studentId or quizData" }, { status: 400 });
    }

    const careerGoal: CareerGoalType = quizData.careerGoal || "NOT_SURE";

    // 1. Update student record
    await prisma.student.update({
      where: { id: studentId },
      data: {
        jeePercentile: quizData.jeePercentile,
        class12Percentage: quizData.class12Percentage,
        budgetLimit: quizData.budgetLimit,
        isBudgetConstraint: quizData.isBudgetConstraint,
        restrictLocation: quizData.restrictLocation,
        careerGoal: careerGoal as any,
      },
    });

    // 2. Sync locations
    await prisma.studentLocation.deleteMany({ where: { studentId } });
    if (quizData.selectedLocations && quizData.selectedLocations.length > 0) {
      await prisma.studentLocation.createMany({
        data: quizData.selectedLocations.map((loc: { state: string; city: string }) => ({
          studentId,
          state: loc.state,
          city: loc.city || "",
        })),
      });
    }

    // 3. Sync priorities
    await prisma.studentPriority.deleteMany({ where: { studentId } });
    if (quizData.priorities && quizData.priorities.length > 0) {
      await prisma.studentPriority.createMany({
        data: quizData.priorities.map((p: { criteria: string; rankOrder: number }) => ({
          studentId,
          criteria: p.criteria.toUpperCase(),
          rankOrder: p.rankOrder,
        })),
      });
    }

    // 4. Run recommendation engine
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    let config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : getDefaultConfig();

    let candidates: CollegeCandidate[] = [];
    try {
      const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
      if (dbBranches && dbBranches.length > 0) {
        candidates = dbBranches.map(mapCandidate);
      }
    } catch {}

    if (candidates.length === 0) {
      const baseData = require("@/lib/base-colleges.json");
      candidates = (baseData as any[]).flatMap((col: any) =>
        (col.branches || []).map((b: any) => ({
          id: col.id,
          name: col.name,
          slug: col.slug,
          state: col.state || "India",
          city: col.city || "City",
          logoUrl: null,
          coverImageUrl: null,
          brochureUrl: null,
          officialApplyUrl: col.officialApplyUrl || col.website || "https://collegematch.in",
          website: col.website || null,
          isPartner: Boolean(col.isPartner),
          isNewGen: Boolean(col.isNewGen),
          commissionRate: 0,
          placementScore: Number(col.placementScore) || 8.5,
          collegeLifeScore: Number(col.collegeLifeScore) || 8.0,
          curriculumScore: Number(col.curriculumScore) || 8.0,
          metadata: JSON.stringify({
            rank: col.rank,
            infra_rating: col.infraRating,
            startup_ecosystem: col.startupEcosystem,
            sports_extracurricular: col.sportsExtracurricular,
            international_exposure: col.internationalExposure,
          }),
          branchId: `${col.id}_${b.branchCode}`,
          branchName: b.branchName || "Computer Science & Engineering",
          branchCode: b.branchCode || "CSE",
          tuitionFeeAnnual: Number(b.tuitionFeeAnnual) || 0,
          hostelFeeAnnual: Number(b.hostelFeeAnnual) || 0,
          seatCapacity: 120,
          avgSalary: Number(b.avgSalary) || 0,
          medianSalary: Number(b.medianSalary) || Number(b.avgSalary) || 0,
          highestSalary: Number(b.highestSalary) || (Number(b.avgSalary) ? Number(b.avgSalary) * 3 : 0),
          minJeePercentileCutoff: Number(b.minJeePercentileCutoff) || 0,
          minClass12Cutoff: Number(b.minClass12Cutoff) || 60,
          branchStrengthScore: 8.5,
          placementPercentage: Number(b.placementPercentage) || 90,
          branchMetadata: null,
        }))
      );
    }

    if (quizData.preferredBranches && quizData.preferredBranches.length > 0) {
      const targetBranches = quizData.preferredBranches.map((b: string) => normalizeBranchCode(b));
      candidates = candidates.filter((c) =>
        targetBranches.includes(normalizeBranchCode(c.branchCode))
      );
    }

    const engineProfile: StudentProfile = {
      jeePercentile: quizData.jeePercentile,
      class12Percentage: quizData.class12Percentage,
      budgetLimit: quizData.budgetLimit,
      isBudgetConstraint: quizData.isBudgetConstraint,
      restrictLocation: quizData.restrictLocation,
      preferredLocations: quizData.selectedLocations || [],
      priorities: quizData.priorities || [],
      preferredBranches: quizData.preferredBranches || [],
      careerGoal: careerGoal || "NOT_SURE",
    };

    const recommendations = generateRecommendations(engineProfile, candidates, config);

    // 5. Store new recommendations (persist core fields for history)
    await prisma.recommendation.deleteMany({ where: { studentId } });
    if (recommendations.length > 0) {
      await prisma.recommendation.createMany({
        data: recommendations.map((r) => ({
          studentId,
          collegeId: r.collegeId,
          branchCode: r.branchCode,
          matchScore: r.matchScore,
          qualityScore: r.qualityScore,
          admissionProbability: r.admissionProbability,
          rankPosition: r.rankPosition,
          reasons: JSON.stringify(r.keyReasons),
        })),
      });
    }

    // 6. Fetch college data with branches for UI
    const collegeIds = [...new Set(recommendations.map((r) => r.collegeId))];
    const colleges = await prisma.college.findMany({
      where: { id: { in: collegeIds } },
      include: { branches: true },
    });
    const collegeMap = new Map(colleges.map((c) => [c.id, c]));

    // 7. Attach college data with branches to each recommendation
    const recommendationsWithBranches = recommendations.map((r, idx) => {
      const college = collegeMap.get(r.collegeId);
      return {
        id: `${r.collegeId}-${r.branchCode}`,
        matchScore: r.matchScore,
        qualityScore: r.qualityScore,
        admissionProbability: r.admissionProbability,
        rankPosition: idx + 1,
        branchCode: r.branchCode,
        reasons: JSON.stringify(r.keyReasons),
        admissionCompetitiveness: r.admissionCompetitiveness,
        scoreBreakdown: r.scoreBreakdown,
        college: college || { id: r.collegeId, name: r.name, slug: r.slug, state: r.state, city: r.city, isNewGen: r.isNewGen, branches: [] },
      };
    });

    return NextResponse.json({ recommendations: recommendationsWithBranches });
  } catch (error: any) {
    console.error("Regenerate API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
