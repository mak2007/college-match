import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import {
  generateRecommendations,
  StudentProfile,
  CollegeCandidate,
  ScoringConfig,
} from "@/lib/recommendation";
import { normalizeBranchCode } from "@/lib/branches";
import { cookies } from "next/headers";

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
      PLACEMENT: { PLACEMENTS: 0.40, ROI: 0.20, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.10, CURRICULUM: 0.15 },
      STARTUP: { PLACEMENTS: 0.10, ROI: 0.10, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.45 },
      HIGHER_STUDIES: { PLACEMENTS: 0.05, ROI: 0.12, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.13, CURRICULUM: 0.55 },
      NOT_SURE: { PLACEMENTS: 0.20, ROI: 0.20, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.20, CURRICULUM: 0.20 },
    },
    priorityAdjustment: { active: true, boostPerRank: 0.10, maxAdjustment: 0.30 },
    careerGoalExtraDimensions: {
      PLACEMENT: [{ key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.15, source: "branch_metadata", computation: "placement_percentage" }],
      STARTUP: [{ key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.15, source: "college_metadata", metadataKey: "startup_ecosystem" }],
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
 * POST /api/admin/recompute-recommendations
 *
 * Superadmin action to regenerate all student recommendations
 * using current college data. Use after updating placement data,
 * cutoffs, scholarships, scores, or New Gen status.
 */
export async function POST() {
  try {

    // 1. Load all students with their profiles
    const students = await prisma.student.findMany({
      include: {
        locations: true,
        priorities: { orderBy: { rankOrder: "asc" } },
        recommendations: true,
      },
    });

    if (students.length === 0) {
      return NextResponse.json({ message: "No students found", updated: 0 });
    }

    // 2. Load fresh branch/college data
    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    const allCandidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

    // 3. Load scoring config
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    const config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : getDefaultConfig();

    let updated = 0;
    let errors = 0;

    for (const student of students) {
      try {
        // Build student profile from DB
        const engineProfile: StudentProfile = {
          jeePercentile: student.jeePercentile,
          class12Percentage: student.class12Percentage,
          budgetLimit: student.budgetLimit,
          isBudgetConstraint: student.isBudgetConstraint,
          restrictLocation: student.restrictLocation,
          preferredLocations: student.locations.map((l) => ({ state: l.state, city: l.city })),
          priorities: student.priorities.map((p) => ({ criteria: p.criteria, rankOrder: p.rankOrder })),
          preferredBranches: ["CSE", "IT", "ECE"],
          careerGoal: (student.careerGoal as any) || "NOT_SURE",
        };

        // Filter candidates by student's preferred branches
        const targetBranches = engineProfile.preferredBranches.map((b) => normalizeBranchCode(b));
        const candidates = allCandidates.filter((c) =>
          targetBranches.includes(normalizeBranchCode(c.branchCode))
        );

        // Run engine
        const recommendations = generateRecommendations(engineProfile, candidates, config);
        const top15 = recommendations.slice(0, 15);

        // Replace stored recommendations
        await prisma.recommendation.deleteMany({ where: { studentId: student.id } });
        if (top15.length > 0) {
          await prisma.recommendation.createMany({
            data: top15.map((r) => ({
              studentId: student.id,
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

        updated++;
      } catch (err) {
        console.error(`Failed to recompute for student ${student.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      message: "Recomputation complete",
      totalStudents: students.length,
      updated,
      errors,
    });
  } catch (error: any) {
    console.error("Recompute API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
