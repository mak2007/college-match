import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRecommendations, StudentProfile, CollegeCandidate, ScoringConfig } from "@/lib/recommendation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student, priorities, preferred_branches } = body;

    if (!student || !student.name || !student.email || !student.phone || !priorities) {
      return NextResponse.json(
        { error: "Missing required student profile parameters" },
        { status: 400 }
      );
    }

    // 1. Save Student record in database
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
      },
    });

    // Clean up older location preferences and priorities for this student
    await prisma.studentLocation.deleteMany({ where: { studentId: dbStudent.id } });
    await prisma.studentPriority.deleteMany({ where: { studentId: dbStudent.id } });

    // Save Location preferences
    if (student.locations && student.locations.length > 0) {
      await prisma.studentLocation.createMany({
        data: student.locations.map((loc: { state: string; city: string }) => ({
          studentId: dbStudent.id,
          state: loc.state,
          city: loc.city || "",
        })),
      });
    }

    // Save priorities
    await prisma.studentPriority.createMany({
      data: priorities.map((p: { criteria: string; rankOrder: number }) => ({
        studentId: dbStudent.id,
        criteria: p.criteria.toUpperCase(),
        rankOrder: p.rankOrder,
      })),
    });

    // 2. Fetch the active Matching Configuration from Database
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

    // 3. Fetch all colleges and branches from database
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

    // Filter by branch code if the student selected specific branches
    if (preferred_branches && preferred_branches.length > 0) {
      candidates = candidates.filter((c) =>
        preferred_branches.map((b: string) => b.toUpperCase()).includes(c.branchCode.toUpperCase())
      );
    }

    // 4. Construct engine student profile input
    const engineProfile: StudentProfile = {
      jeePercentile: student.jee_percentile,
      class12Percentage: student.class_12_percentage,
      budgetLimit: student.budget_limit,
      isBudgetConstraint: student.is_budget_constraint,
      restrictLocation: student.restrict_location,
      preferredLocations: student.locations || [],
      priorities: priorities,
      preferredBranches: preferred_branches || [],
    };

    // 5. Run Configurable Recommendation Scoring Engine
    const recommendations = generateRecommendations(engineProfile, candidates, config);

    // Take top 10 results
    const top10 = recommendations.slice(0, 10);

    // Save recommendations logs (serialize key reasons)
    await prisma.recommendation.deleteMany({ where: { studentId: dbStudent.id } });
    if (top10.length > 0) {
      await prisma.recommendation.createMany({
        data: top10.map((r) => ({
          studentId: dbStudent.id,
          collegeId: r.collegeId,
          branchCode: r.branchCode,
          matchScore: r.matchScore,
          rankPosition: r.rankPosition,
          reasons: JSON.stringify(r.keyReasons),
        })),
      });
    }

    return NextResponse.json({
      student_id: dbStudent.id,
      recommendations: top10,
    });
  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
