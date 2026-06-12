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
      HIGHER_STUDIES_INDIA: { PLACEMENTS: 0.10, ROI: 0.20, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.10, CURRICULUM: 0.45 },
      HIGHER_STUDIES_ABROAD: { PLACEMENTS: 0.05, ROI: 0.15, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.15, CURRICULUM: 0.50 },
      GOVERNMENT_EXAMS: { PLACEMENTS: 0.15, ROI: 0.35, BRANCH_STRENGTH: 0.10, COLLEGE_LIFE: 0.10, CURRICULUM: 0.30 },
      NOT_SURE: { PLACEMENTS: 0.20, ROI: 0.20, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.20, CURRICULUM: 0.20 },
    },
    priorityAdjustment: { active: true, boostPerRank: 0.10, maxAdjustment: 0.30 },
    careerGoalExtraDimensions: {
      PLACEMENT: [{ key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.10, source: "branch_metadata", computation: "placement_percentage" }],
      STARTUP: [{ key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.10, source: "college_metadata", metadataKey: "startup_ecosystem" }],
      HIGHER_STUDIES_INDIA: [{ key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.10, source: "college_metadata", metadataKey: "research_output" }],
      HIGHER_STUDIES_ABROAD: [
        { key: "INTERNATIONAL_EXPOSURE", label: "International exposure & exchange programs", weight: 0.10, source: "college_metadata", metadataKey: "international_exposure" },
        { key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.05, source: "college_metadata", metadataKey: "research_output" },
      ],
      GOVERNMENT_EXAMS: [],
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

    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    let candidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

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
    const top15 = recommendations.slice(0, 15);

    // 5. Store new recommendations
    await prisma.recommendation.deleteMany({ where: { studentId } });
    if (top15.length > 0) {
      await prisma.recommendation.createMany({
        data: top15.map((r) => ({
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

    // 6. Return fresh recommendations with college data
    const freshRecs = await prisma.recommendation.findMany({
      where: { studentId },
      orderBy: { rankPosition: "asc" },
      include: {
        college: {
          include: { branches: true },
        },
      },
    });

    return NextResponse.json({ recommendations: freshRecs });
  } catch (error: any) {
    console.error("Regenerate API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
