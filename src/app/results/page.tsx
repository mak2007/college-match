import { prisma } from "@/lib/db";
import Link from "next/link";
import ResultsClient from "./ResultsClient";
import { generateRecommendations } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

interface ResultsProps {
  searchParams: Promise<{ student_id?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsProps) {
  const params = await searchParams;
  const studentId = params.student_id;

  if (!studentId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFAF0" }}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>No recommendations found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            It looks like you haven&apos;t filled out the preference quiz yet.
          </p>
          <Link href="/predict" className="btn btn-primary">
            Start Predictor Quiz
          </Link>
        </div>
      </div>
    );
  }

  let student: any = null;
  let dbRecommendations: any[] = [];

  try {
    student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        locations: true,
        priorities: { orderBy: { rankOrder: "asc" } },
      },
    });

    if (student) {
      dbRecommendations = await prisma.recommendation.findMany({
        where: { studentId },
        orderBy: { rankPosition: "asc" },
        include: {
          college: {
            include: {
              branches: true,
            },
          },
        },
      });
    }
  } catch (err) {
    console.error("ResultsPage DB fetch error:", err);
  }

  if (!student) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFAF0" }}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>Student record not found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            The student ID provided is invalid or has been removed.
          </p>
          <Link href="/predict" className="btn btn-primary">
            Restart Quiz
          </Link>
        </div>
      </div>
    );
  }

  // Calculate score breakdowns dynamically
  let recommendationsWithBreakdown = dbRecommendations as any;
  try {
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    const config = dbConfig ? JSON.parse(dbConfig.value) : {
      weightStrategy: "CAREER_GOAL_PRIORITY",
      manualWeights: { PLACEMENTS: 0.30, ROI: 0.25, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.10 },
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

    const candidates = dbRecommendations.map((rec) => {
      const branch = rec.college.branches.find((b: any) => b.branchCode === rec.branchCode);
      if (!branch) return null;
      return {
        id: rec.college.id,
        name: rec.college.name,
        slug: rec.college.slug,
        state: rec.college.state,
        city: rec.college.city,
        logoUrl: rec.college.logoUrl,
        coverImageUrl: rec.college.coverImageUrl,
        brochureUrl: rec.college.brochureUrl,
        officialApplyUrl: rec.college.officialApplyUrl,
        website: rec.college.website,
        isPartner: rec.college.isPartner,
        isNewGen: rec.college.isNewGen,
        commissionRate: rec.college.commissionRate,
        placementScore: rec.college.placementScore,
        collegeLifeScore: rec.college.collegeLifeScore,
        curriculumScore: rec.college.curriculumScore,
        metadata: rec.college.metadata,

        branchId: branch.id,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        tuitionFeeAnnual: branch.tuitionFeeAnnual,
        hostelFeeAnnual: branch.hostelFeeAnnual,
        seatCapacity: branch.seatCapacity,
        avgSalary: branch.avgSalary,
        medianSalary: branch.medianSalary,
        highestSalary: branch.highestSalary,
        minJeePercentileCutoff: branch.minJeePercentileCutoff,
        minClass12Cutoff: branch.minClass12Cutoff,
        branchStrengthScore: branch.branchStrengthScore,
        placementPercentage: branch.placementPercentage,
        branchMetadata: branch.metadata,
      };
    }).filter(Boolean);

    const engineProfile = {
      jeePercentile: student.jeePercentile,
      class12Percentage: student.class12Percentage,
      budgetLimit: student.budgetLimit,
      isBudgetConstraint: student.isBudgetConstraint,
      restrictLocation: student.restrictLocation,
      preferredLocations: student.locations.map((l: any) => ({ state: l.state, city: l.city })),
      priorities: student.priorities.map((p: any) => ({ criteria: p.criteria.toLowerCase(), rankOrder: p.rankOrder })),
      preferredBranches: dbRecommendations.map((r) => r.branchCode),
      careerGoal: student.careerGoal || "NOT_SURE",
    };

    const scoredRecommendations = generateRecommendations(engineProfile as any, candidates as any, config);
    const scoredMap = new Map(scoredRecommendations.map((r) => [`${r.collegeId}-${r.branchCode}`, r]));

    recommendationsWithBreakdown = dbRecommendations.map((rec) => {
      const scored = scoredMap.get(`${rec.collegeId}-${rec.branchCode}`);
      return {
        id: rec.id,
        matchScore: scored ? scored.matchScore : rec.matchScore,
        qualityScore: scored ? scored.qualityScore : rec.qualityScore,
        admissionProbability: scored ? scored.admissionProbability : rec.admissionProbability,
        rankPosition: scored ? scored.rankPosition : rec.rankPosition,
        branchCode: rec.branchCode,
        reasons: scored ? JSON.stringify(scored.keyReasons) : rec.reasons,
        admissionCompetitiveness: scored ? scored.admissionCompetitiveness : undefined,
        college: rec.college,
        scoreBreakdown: scored ? scored.scoreBreakdown : undefined,
      };
    });
  } catch (e) {
    console.error("Error computing score breakdowns on load:", e);
  }

  return (
    <ResultsClient
      student={{
        id: student.id,
        name: student.name,
        jeePercentile: student.jeePercentile,
        class12Percentage: student.class12Percentage,
        budgetLimit: student.budgetLimit,
        isBudgetConstraint: student.isBudgetConstraint,
        restrictLocation: student.restrictLocation,
        careerGoal: student.careerGoal || "NOT_SURE",
        locations: student.locations.map((l: any) => ({ state: l.state, city: l.city })),
        priorities: student.priorities.map((p: any) => ({ criteria: p.criteria, rankOrder: p.rankOrder })),
      }}
      recommendations={recommendationsWithBreakdown}
    />
  );
}
