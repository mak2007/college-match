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
        { key: "EXPOSURE_SCORE", label: "Industry & internship exposure", weight: 0.05, source: "college_metadata", metadataKey: "exposure_score" },
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
 * POST /api/recommendations/from-quiz
 *
 * Called after authentication to create a student record from quiz data
 * stored in localStorage, run the recommendation engine, and return
 * the student_id for redirect to the results page.
 *
 * Body: { quizData: { ...quiz inputs... } }
 */
export async function POST(request: Request) {
  try {
    // 1. Get user session or generate guest identifier
    let session = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("cm_auth_token")?.value;
      if (token) session = await verifyToken(token);
    } catch {
      session = null;
    }

    // 2. Parse quiz data from request body
    const body = await request.json();
    const { quizData } = body;

    if (!quizData) {
      return NextResponse.json({ error: "Missing quiz data" }, { status: 400 });
    }

    const careerGoal: CareerGoalType = quizData.careerGoal || "NOT_SURE";

    // 3. Find or create student record
    const email = session?.email || `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@collegematch.in`;
    const name = email.split("@")[0];

    let studentId = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      const dbStudent = await prisma.student.upsert({
        where: { email },
        update: {
          name,
          jeePercentile: quizData.jeePercentile,
          class12Percentage: quizData.class12Percentage,
          budgetLimit: quizData.budgetLimit,
          isBudgetConstraint: quizData.isBudgetConstraint,
          restrictLocation: quizData.restrictLocation,
          careerGoal: careerGoal as any,
        },
        create: {
          name,
          email,
          phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
          jeePercentile: quizData.jeePercentile,
          class12Percentage: quizData.class12Percentage,
          budgetLimit: quizData.budgetLimit,
          isBudgetConstraint: quizData.isBudgetConstraint,
          restrictLocation: quizData.restrictLocation,
          careerGoal: careerGoal as any,
        },
      });

      studentId = dbStudent.id;

      // 4. Update locations and priorities
      try {
        await prisma.studentLocation.deleteMany({ where: { studentId: dbStudent.id } });
        await prisma.studentPriority.deleteMany({ where: { studentId: dbStudent.id } });

        if (quizData.selectedLocations && quizData.selectedLocations.length > 0) {
          await prisma.studentLocation.createMany({
            data: quizData.selectedLocations.map((loc: { state: string; city: string }) => ({
              studentId: dbStudent.id,
              state: loc.state,
              city: loc.city || "",
            })),
          });
        }

        if (quizData.priorities && quizData.priorities.length > 0) {
          await prisma.studentPriority.createMany({
            data: quizData.priorities.map((p: { criteria: string; rankOrder: number }) => ({
              studentId: dbStudent.id,
              criteria: p.criteria.toUpperCase(),
              rankOrder: p.rankOrder,
            })),
          });
        }
      } catch (locErr) {
        console.warn("Non-fatal location/priority update error:", locErr);
      }

      // 5. Run recommendation engine
      let config: ScoringConfig = getDefaultConfig();
      try {
        const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
        if (dbConfig) config = JSON.parse(dbConfig.value);
      } catch {}

      const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
      let candidates: CollegeCandidate[] = (dbBranches || []).map(mapCandidate);

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
      const top100 = recommendations.slice(0, 100);

      // 6. Store recommendations in DB
      try {
        await prisma.recommendation.deleteMany({ where: { studentId: dbStudent.id } });
        if (top100.length > 0) {
          await prisma.recommendation.createMany({
            data: top100.map((r) => ({
              studentId: dbStudent.id,
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
      } catch (recErr) {
        console.warn("Non-fatal recommendation cache error:", recErr);
      }
    } catch (dbErr) {
      console.warn("Non-fatal DB write error:", dbErr);
    }

    return NextResponse.json({ student_id: studentId });
  } catch (error: any) {
    console.error("From-Quiz API Error:", error);
    return NextResponse.json({ student_id: `guest_${Date.now()}` });
  }
}
