import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
    const { student, priorities, preferred_branches } = body;

    if (!student || !student.name || !student.email || !student.phone || !priorities) {
      return NextResponse.json({ error: "Missing required student profile parameters" }, { status: 400 });
    }

    const careerGoal: CareerGoalType = student.career_goal || student.careerGoal || "NOT_SURE";

    const dbStudent = await prisma.student.upsert({
      where: { email: student.email },
      update: {
        name: student.name,
        phone: student.phone,
        jeePercentile: student.jee_percentile,
        class12Percentage: student.class_12_percentage,
        budgetLimit: student.budget_limit,
        isBudgetConstraint: student.is_budget_constraint,
        restrictLocation: student.restrict_location,
        careerGoal: careerGoal as any,
        examType: student.exam_type || student.examType || null,
      },
      create: {
        name: student.name,
        email: student.email,
        phone: student.phone,
        jeePercentile: student.jee_percentile,
        class12Percentage: student.class_12_percentage,
        budgetLimit: student.budget_limit,
        isBudgetConstraint: student.is_budget_constraint,
        restrictLocation: student.restrict_location,
        careerGoal: careerGoal as any,
        examType: student.exam_type || student.examType || null,
      },
    });

    await prisma.studentLocation.deleteMany({ where: { studentId: dbStudent.id } });
    await prisma.studentPriority.deleteMany({ where: { studentId: dbStudent.id } });

    if (student.locations && student.locations.length > 0) {
      await prisma.studentLocation.createMany({
        data: student.locations.map((loc: { state: string; city: string }) => ({
          studentId: dbStudent.id,
          state: loc.state,
          city: loc.city || "",
        })),
      });
    }

    await prisma.studentPriority.createMany({
      data: priorities.map((p: { criteria: string; rankOrder: number }) => ({
        studentId: dbStudent.id,
        criteria: p.criteria.toUpperCase(),
        rankOrder: p.rankOrder,
      })),
    });

    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    let config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : getDefaultConfig();

    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    let candidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

    if (preferred_branches && preferred_branches.length > 0) {
      const targetBranches = preferred_branches.map((b: string) => normalizeBranchCode(b));
      candidates = candidates.filter((c) =>
        targetBranches.includes(normalizeBranchCode(c.branchCode))
      );
    }

    const engineProfile: StudentProfile = {
      jeePercentile: student.jee_percentile,
      class12Percentage: student.class_12_percentage,
      budgetLimit: student.budget_limit,
      isBudgetConstraint: student.is_budget_constraint,
      restrictLocation: student.restrict_location,
      preferredLocations: student.locations || [],
      priorities: priorities,
      preferredBranches: preferred_branches || [],
      careerGoal: careerGoal || "NOT_SURE",
    };

    const recommendations = generateRecommendations(engineProfile, candidates, config);
    const top10 = recommendations.slice(0, 10);

    await prisma.recommendation.deleteMany({ where: { studentId: dbStudent.id } });
    if (top10.length > 0) {
      await prisma.recommendation.createMany({
        data: top10.map((r) => ({
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

    return NextResponse.json({ student_id: dbStudent.id, recommendations: top10 });
  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
