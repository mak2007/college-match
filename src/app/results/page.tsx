import { Suspense } from "react";
import { prisma } from "@/lib/db";
import Link from "next/link";
import ResultsClient from "./ResultsClient";
import { generateRecommendations, ScoringConfig, CollegeCandidate, StudentProfile } from "@/lib/recommendation";
import baseCollegesData from "@/lib/base-colleges.json";

export const dynamic = "force-dynamic";

interface ResultsProps {
  searchParams: Promise<{ student_id?: string }>;
}

function getDefaultConfig(): ScoringConfig {
  return {
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
}

export default async function ResultsPage({ searchParams }: ResultsProps) {
  const params = await searchParams;
  const studentId = params.student_id;

  let student: any = null;

  if (studentId) {
    try {
      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          locations: true,
          priorities: { orderBy: { rankOrder: "asc" } },
        },
      });
    } catch (err) {
      console.error("ResultsPage DB student fetch error:", err);
    }
  }

  if (!student) {
    student = {
      id: studentId || "guest_student",
      name: "Student",
      jeePercentile: 90,
      class12Percentage: 85,
      budgetLimit: 1500000,
      isBudgetConstraint: false,
      restrictLocation: false,
      careerGoal: "NOT_SURE",
      locations: [],
      priorities: [
        { criteria: "PLACEMENTS", rankOrder: 1 },
        { criteria: "CURRICULUM", rankOrder: 2 },
        { criteria: "CAMPUS_LIFE", rankOrder: 3 },
        { criteria: "RESEARCH", rankOrder: 4 },
        { criteria: "EXTRACURRICULARS", rankOrder: 5 },
      ],
    };
  }

  // 1. Prepare candidates
  let candidates: CollegeCandidate[] = [];
  try {
    const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
    if (dbBranches && dbBranches.length > 0) {
      candidates = dbBranches.map((b: any) => ({
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
        branchStrengthScore: b.branchStrengthScore || 8.5,
        placementPercentage: b.placementPercentage || 90,
        branchMetadata: b.metadata,
      }));
    }
  } catch {}

  if (candidates.length === 0) {
    candidates = (baseCollegesData as any[]).flatMap((col: any) =>
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

  // 2. Load Config
  let config: ScoringConfig = getDefaultConfig();
  try {
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
    if (dbConfig) config = JSON.parse(dbConfig.value);
  } catch {}

  // 3. Generate scored recommendations
  const engineProfile: StudentProfile = {
    jeePercentile: student.jeePercentile,
    class12Percentage: student.class12Percentage,
    budgetLimit: student.budgetLimit,
    isBudgetConstraint: student.isBudgetConstraint,
    restrictLocation: student.restrictLocation,
    preferredLocations: (student.locations || []).map((l: any) => ({ state: l.state, city: l.city })),
    priorities: (student.priorities || []).map((p: any) => ({ criteria: p.criteria, rankOrder: p.rankOrder })),
    preferredBranches: ["CSE"],
    careerGoal: student.careerGoal || "NOT_SURE",
  };

  const scoredRecommendations = generateRecommendations(engineProfile, candidates, config);

  const finalRecommendations = scoredRecommendations.map((r, idx) => ({
    id: `rec_${idx}`,
    collegeId: r.collegeId,
    branchCode: r.branchCode,
    matchScore: r.matchScore,
    qualityScore: r.qualityScore,
    admissionProbability: r.admissionProbability,
    rankPosition: r.rankPosition || idx + 1,
    reasons: JSON.stringify(r.keyReasons),
    admissionCompetitiveness: r.admissionCompetitiveness,
    college: {
      id: r.collegeId,
      name: r.name,
      slug: r.slug,
      city: r.city,
      state: r.state,
      isPartner: r.isPartner,
      isNewGen: r.isNewGen,
      branches: [
        {
          branchCode: r.branchCode,
          branchName: r.branchName,
          tuitionFeeAnnual: r.feeInfo.annualTuition,
          hostelFeeAnnual: r.feeInfo.annualHostel,
          avgSalary: r.placementInfo.avgSalary,
          medianSalary: r.placementInfo.medianSalary,
          highestSalary: r.placementInfo.highestSalary,
          minJeePercentileCutoff: 85,
          minClass12Cutoff: 60,
          placementPercentage: r.placementInfo.placementPercentage,
        },
      ],
    },
    scoreBreakdown: r.scoreBreakdown,
  }));

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fcfbfe" }}>Loading recommendations...</div>}>
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
          locations: (student.locations || []).map((l: any) => ({ state: l.state, city: l.city })),
          priorities: (student.priorities || []).map((p: any) => ({ criteria: p.criteria, rankOrder: p.rankOrder })),
        }}
        recommendations={finalRecommendations as any}
      />
    </Suspense>
  );
}
