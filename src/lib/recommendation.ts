// Configurable & Explainable Recommendation Engine Logic for CollegeMatch

export type CareerGoalType =
  | "PLACEMENT"
  | "STARTUP"
  | "HIGHER_STUDIES_INDIA"
  | "HIGHER_STUDIES_ABROAD"
  | "GOVERNMENT_EXAMS"
  | "NOT_SURE";

export interface StudentProfile {
  jeePercentile?: number | null;
  class12Percentage?: number | null;
  budgetLimit?: number | null;
  isBudgetConstraint: boolean;
  restrictLocation: boolean;
  preferredLocations: { state: string; city: string }[];
  priorities: { criteria: string; rankOrder: number }[];
  preferredBranches: string[];
  careerGoal?: CareerGoalType | null;
}

export interface CollegeCandidate {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brochureUrl: string | null;
  officialApplyUrl: string;
  website: string | null;
  isPartner: boolean;
  commissionRate: number;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  metadata: string | null;

  // Branch details
  branchId: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  seatCapacity: number;
  avgSalary: number | null;
  medianSalary: number | null;
  highestSalary: number | null;
  minJeePercentileCutoff: number | null;
  minClass12Cutoff: number | null;
  branchStrengthScore: number;
  placementPercentage: number | null;
  branchMetadata: string | null;
}

export interface CareerGoalWeights {
  PLACEMENTS: number;
  ROI: number;
  BRANCH_STRENGTH: number;
  COLLEGE_LIFE: number;
  CURRICULUM: number;
}

export interface CareerGoalExtraDimension {
  key: string;
  label: string;
  weight: number;
  source: "college_metadata" | "branch_metadata" | "computed";
  metadataKey?: string;
  computation?: "placement_percentage" | "highest_salary" | "startup_ecosystem";
}

export interface ScoringConfig {
  weightStrategy: "CAREER_GOAL_PRIORITY" | "ROC" | "EQUAL" | "MANUAL";
  manualWeights: {
    PLACEMENTS: number;
    ROI: number;
    BRANCH_STRENGTH: number;
    COLLEGE_LIFE: number;
    CURRICULUM: number;
  };
  careerGoalWeights: Record<CareerGoalType, CareerGoalWeights>;
  priorityAdjustment: {
    active: boolean;
    boostPerRank: number; // ±0.10 default
    maxAdjustment: number; // ±0.30 default
  };
  careerGoalExtraDimensions: Record<CareerGoalType, CareerGoalExtraDimension[]>;
  budgetPenalty: {
    active: boolean;
    thresholdMultiplier: number;
    basePenaltyWeight: number;
    exponent: number;
  };
  academicCompetitiveness: {
    active: boolean;
    safeThreshold: number;
    reachThreshold: number;
    unlikelyThreshold: number;
    reachPenaltyScale: number;
    unlikelyPenaltyScale: number;
    excludeLimit: number;
  };
  bonusRules: {
    id: string;
    type: "PLACEMENT_AVERAGE" | "IS_PARTNER" | "CUSTOM_ATTRIBUTE";
    attributeKey?: string;
    threshold?: number;
    bonus: number;
    reason: string;
  }[];
  customScoringAttributes: {
    key: string;
    label: string;
    weight: number;
    defaultValue: number;
  }[];
}

export interface FactorContribution {
  factor: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface AppliedModifier {
  id: string;
  type: "BONUS" | "PENALTY";
  value: number;
  reason: string;
}

export interface MatchScoreBreakdown {
  baseScore: number;
  factorContributions: FactorContribution[];
  appliedBonuses: AppliedModifier[];
  appliedPenalties: AppliedModifier[];
  finalScore: number;
}

export interface MatchResult {
  collegeId: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  officialApplyUrl: string;
  website: string | null;
  isPartner: boolean;

  branchName: string;
  branchCode: string;
  matchScore: number;
  rankPosition: number;

  feeInfo: {
    annualTuition: number;
    annualHostel: number;
    total4YrCost: number;
  };

  placementInfo: {
    avgSalary: number | null;
    medianSalary: number | null;
    highestSalary: number | null;
    placementPercentage: number | null;
  };

  admissionCompetitiveness: {
    category: "Safe" | "Target" | "Reach" | "Unlikely";
    badgeText: string;
  };

  keyReasons: string[];
  scoreBreakdown: MatchScoreBreakdown;
}

const DEFAULT_CAREER_GOAL_WEIGHTS: Record<CareerGoalType, CareerGoalWeights> = {
  PLACEMENT: {
    PLACEMENTS: 0.35,
    ROI: 0.25,
    BRANCH_STRENGTH: 0.15,
    COLLEGE_LIFE: 0.10,
    CURRICULUM: 0.15,
  },
  STARTUP: {
    PLACEMENTS: 0.15,
    ROI: 0.15,
    BRANCH_STRENGTH: 0.20,
    COLLEGE_LIFE: 0.15,
    CURRICULUM: 0.35,
  },
  HIGHER_STUDIES_INDIA: {
    PLACEMENTS: 0.10,
    ROI: 0.20,
    BRANCH_STRENGTH: 0.15,
    COLLEGE_LIFE: 0.10,
    CURRICULUM: 0.45,
  },
  HIGHER_STUDIES_ABROAD: {
    PLACEMENTS: 0.05,
    ROI: 0.15,
    BRANCH_STRENGTH: 0.15,
    COLLEGE_LIFE: 0.15,
    CURRICULUM: 0.50,
  },
  GOVERNMENT_EXAMS: {
    PLACEMENTS: 0.15,
    ROI: 0.35,
    BRANCH_STRENGTH: 0.10,
    COLLEGE_LIFE: 0.10,
    CURRICULUM: 0.30,
  },
  NOT_SURE: {
    PLACEMENTS: 0.20,
    ROI: 0.20,
    BRANCH_STRENGTH: 0.20,
    COLLEGE_LIFE: 0.20,
    CURRICULUM: 0.20,
  },
};

const DEFAULT_EXTRA_DIMENSIONS: Record<CareerGoalType, CareerGoalExtraDimension[]> = {
  PLACEMENT: [
    {
      key: "PLACEMENT_PERCENTAGE",
      label: "Branch placement rate",
      weight: 0.10,
      source: "branch_metadata",
      computation: "placement_percentage",
    },
  ],
  STARTUP: [
    {
      key: "STARTUP_ECOSYSTEM",
      label: "Startup ecosystem & incubation",
      weight: 0.10,
      source: "college_metadata",
      metadataKey: "startup_ecosystem",
    },
  ],
  HIGHER_STUDIES_INDIA: [
    {
      key: "RESEARCH_OUTPUT",
      label: "Research output & publications",
      weight: 0.10,
      source: "college_metadata",
      metadataKey: "research_output",
    },
  ],
  HIGHER_STUDIES_ABROAD: [
    {
      key: "INTERNATIONAL_EXPOSURE",
      label: "International exposure & exchange programs",
      weight: 0.10,
      source: "college_metadata",
      metadataKey: "international_exposure",
    },
    {
      key: "RESEARCH_OUTPUT",
      label: "Research output & publications",
      weight: 0.05,
      source: "college_metadata",
      metadataKey: "research_output",
    },
  ],
  GOVERNMENT_EXAMS: [],
  NOT_SURE: [],
};

// 1. Normalize weights to sum to 1.0
function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return weights;
  const normalized: Record<string, number> = {};
  for (const key of Object.keys(weights)) {
    normalized[key] = weights[key] / total;
  }
  return normalized;
}

// 2. Calculate Weights dynamically based on strategy configuration
export function getWeights(
  priorities: { criteria: string; rankOrder: number }[],
  config: ScoringConfig,
  careerGoal?: CareerGoalType | null
): Record<string, number> {
  const weights: Record<string, number> = {};

  if (config.weightStrategy === "MANUAL") {
    Object.entries(config.manualWeights).forEach(([key, val]) => {
      weights[key.toUpperCase()] = val;
    });
  } else if (config.weightStrategy === "EQUAL") {
    const CORE_CRITERIA = ["PLACEMENTS", "ROI", "BRANCH_STRENGTH", "COLLEGE_LIFE", "CURRICULUM"];
    CORE_CRITERIA.forEach((key) => {
      weights[key] = 0.20;
    });
  } else if (config.weightStrategy === "ROC") {
    const sorted = [...priorities].sort((a, b) => a.rankOrder - b.rankOrder);
    const ROC_WEIGHTS = [0.4567, 0.2567, 0.1567, 0.0900, 0.0400];
    sorted.forEach((p, idx) => {
      weights[p.criteria.toUpperCase()] = ROC_WEIGHTS[idx] || 0.04;
    });
  } else {
    // CAREER_GOAL_PRIORITY (default)
    const goal = careerGoal || "NOT_SURE";
    const template = config.careerGoalWeights?.[goal] || DEFAULT_CAREER_GOAL_WEIGHTS[goal];

    // Layer 1: Career Goal template
    Object.entries(template).forEach(([key, val]) => {
      weights[key] = val;
    });

    // Layer 2: Priority adjustment (±30% max)
    if (config.priorityAdjustment?.active && priorities.length > 0) {
      const sorted = [...priorities].sort((a, b) => a.rankOrder - b.rankOrder);
      const boostPerRank = config.priorityAdjustment.boostPerRank || 0.10;
      const maxAdj = config.priorityAdjustment.maxAdjustment || 0.30;

      sorted.forEach((p) => {
        const criteria = p.criteria.toUpperCase();
        if (weights[criteria] !== undefined) {
          const rankFrom1 = p.rankOrder - 1;
          const adjustment = -rankFrom1 * boostPerRank;
          const clampedAdj = Math.max(-maxAdj, Math.min(maxAdj, adjustment));
          weights[criteria] = weights[criteria] * (1 + clampedAdj);
        }
      });

      // Normalize after adjustment
      const normalized = normalizeWeights(weights);
      Object.keys(weights).forEach((key) => {
        weights[key] = normalized[key];
      });
    }
  }

  // Factor in custom attributes weights if defined
  let totalCoreWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let totalCustomWeight = config.customScoringAttributes.reduce((sum, attr) => sum + attr.weight, 0);

  const scaleFactor = 1.0 / (totalCoreWeight + totalCustomWeight);

  Object.keys(weights).forEach((key) => {
    weights[key] = weights[key] * scaleFactor;
  });

  config.customScoringAttributes.forEach((attr) => {
    weights[attr.key.toUpperCase()] = attr.weight * scaleFactor;
  });

  // Fold in career goal extra dimensions
  const goal = careerGoal || "NOT_SURE";
  const extras = config.careerGoalExtraDimensions?.[goal] || DEFAULT_EXTRA_DIMENSIONS[goal] || [];
  let totalExtraWeight = extras.reduce((sum, e) => sum + e.weight, 0);

  if (totalExtraWeight > 0) {
    const extraScaleFactor = 1.0 / (1.0 + totalExtraWeight);
    Object.keys(weights).forEach((key) => {
      weights[key] = weights[key] * extraScaleFactor;
    });
    extras.forEach((extra) => {
      weights[extra.key] = extra.weight * extraScaleFactor;
    });
  }

  return weights;
}

// 3. Main Configurable Recommendation Scoring Algorithm
export function generateRecommendations(
  student: StudentProfile,
  candidates: CollegeCandidate[],
  config: ScoringConfig
): MatchResult[] {
  if (candidates.length === 0) return [];

  // Pre-calculate ROI ranges for normalization
  const roiRatios = candidates.map((c) => {
    const total4YrTuition = c.tuitionFeeAnnual * 4;
    const avgSal = c.avgSalary || 450000;
    return total4YrTuition > 0 ? avgSal / total4YrTuition : 0;
  });

  const maxRoi = Math.max(...roiRatios, 0.1);
  const minRoi = Math.min(...roiRatios, maxRoi);

  // Calculate dynamic normalized weights
  const weights = getWeights(student.priorities, config, student.careerGoal);
  const topPriority =
    student.priorities.find((p) => p.rankOrder === 1)?.criteria.toUpperCase() || "PLACEMENTS";
  const careerGoal = student.careerGoal || "NOT_SURE";

  // Get extra dimensions for this career goal
  const extras = config.careerGoalExtraDimensions?.[careerGoal] || DEFAULT_EXTRA_DIMENSIONS[careerGoal] || [];

  const results: MatchResult[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const total4YrCost = (c.tuitionFeeAnnual + c.hostelFeeAnnual) * 4;

    // Parse JSON Metadata
    let collegeMeta: Record<string, any> = {};
    try {
      if (c.metadata) collegeMeta = JSON.parse(c.metadata);
    } catch (e) {
      console.warn("Failed to parse college metadata:", c.metadata);
    }

    let branchMeta: Record<string, any> = {};
    try {
      if (c.branchMetadata) branchMeta = JSON.parse(c.branchMetadata);
    } catch (e) {
      console.warn("Failed to parse branch metadata:", c.branchMetadata);
    }

    // --- STAGE 1: GEOGRAPHIC FILTER ---
    if (student.restrictLocation && student.preferredLocations.length > 0) {
      const isLocationMatched = student.preferredLocations.some(
        (loc) =>
          loc.state.toLowerCase() === c.state.toLowerCase() &&
          (!loc.city || loc.city.toLowerCase() === c.city.toLowerCase())
      );
      if (!isLocationMatched) continue;
    }

    // --- STAGE 2: BUDGET PENALTY ---
    let budgetPenaltyVal = 0;
    const appliedPenalties: AppliedModifier[] = [];

    if (config.budgetPenalty.active && student.isBudgetConstraint && student.budgetLimit) {
      const limit = student.budgetLimit;
      const multiplier = config.budgetPenalty.thresholdMultiplier;

      if (total4YrCost > multiplier * limit) {
        continue;
      } else if (total4YrCost > limit) {
        const range = (multiplier - 1.0) * limit;
        budgetPenaltyVal =
          Math.pow((total4YrCost - limit) / range, config.budgetPenalty.exponent) *
          config.budgetPenalty.basePenaltyWeight;
        appliedPenalties.push({
          id: "budget_overrun",
          type: "PENALTY",
          value: Math.round(budgetPenaltyVal * 10) / 10,
          reason: `Total cost (₹${(total4YrCost / 100000).toFixed(1)}L) exceeds budget limit (₹${(limit / 100000).toFixed(1)}L)`,
        });
      }
    }

    // --- STAGE 3: ACADEMIC FIT & PENALTY ---
    let academicPenaltyVal = 0;
    let category: "Safe" | "Target" | "Reach" | "Unlikely" = "Target";
    let badgeText = "Good Fit";

    const jeeGap =
      student.jeePercentile && c.minJeePercentileCutoff
        ? student.jeePercentile - c.minJeePercentileCutoff
        : null;

    const c12Gap =
      student.class12Percentage && c.minClass12Cutoff
        ? student.class12Percentage - c.minClass12Cutoff
        : null;

    let bestGap: number | null = null;
    if (jeeGap !== null && c12Gap !== null) {
      bestGap = Math.max(jeeGap, c12Gap);
    } else {
      bestGap = jeeGap !== null ? jeeGap : c12Gap;
    }

    if (config.academicCompetitiveness.active && bestGap !== null) {
      const activeLimits = config.academicCompetitiveness;

      if (bestGap < activeLimits.excludeLimit) {
        continue;
      } else if (bestGap < activeLimits.unlikelyThreshold) {
        category = "Unlikely";
        badgeText = "Competitiveness: Unlikely";
        academicPenaltyVal = Math.abs(bestGap) * activeLimits.unlikelyPenaltyScale;
        appliedPenalties.push({
          id: "academic_unlikely",
          type: "PENALTY",
          value: Math.round(academicPenaltyVal * 10) / 10,
          reason: `Academic score gap of ${bestGap.toFixed(1)} is below target cutoff thresholds`,
        });
      } else if (bestGap < activeLimits.reachThreshold) {
        category = "Reach";
        badgeText = "Competitiveness: Reach";
        academicPenaltyVal = Math.abs(bestGap) * activeLimits.reachPenaltyScale;
        appliedPenalties.push({
          id: "academic_reach",
          type: "PENALTY",
          value: Math.round(academicPenaltyVal * 10) / 10,
          reason: `Academic score gap of ${bestGap.toFixed(1)} requires competitive reach admissions`,
        });
      } else if (bestGap >= activeLimits.safeThreshold) {
        category = "Safe";
        badgeText = "Competitiveness: Safe";
      } else {
        category = "Target";
        badgeText = "Competitiveness: Target";
      }
    }

    // --- STAGE 4: FACTOR SUB-SCORES (0-100) & CONTRIBUTIONS ---
    const factorContributions: FactorContribution[] = [];

    // Core 1: Placements
    const sPlacement = c.placementScore * 10;
    const wPlacement = weights.PLACEMENTS || 0;
    factorContributions.push({
      factor: "PLACEMENTS",
      label: "Placement outcomes",
      score: Math.round(sPlacement),
      weight: Math.round(wPlacement * 100) / 100,
      contribution: Math.round(sPlacement * wPlacement * 10) / 10,
    });

    // Core 2: College Life
    const sLife = c.collegeLifeScore * 10;
    const wLife = weights.COLLEGE_LIFE || 0;
    factorContributions.push({
      factor: "COLLEGE_LIFE",
      label: "Campus life & hostels",
      score: Math.round(sLife),
      weight: Math.round(wLife * 100) / 100,
      contribution: Math.round(sLife * wLife * 10) / 10,
    });

    // Core 3: Branch Strength
    const sBranch = c.branchStrengthScore * 10;
    const wBranch = weights.BRANCH_STRENGTH || 0;
    factorContributions.push({
      factor: "BRANCH_STRENGTH",
      label: `${c.branchCode} department strength`,
      score: Math.round(sBranch),
      weight: Math.round(wBranch * 100) / 100,
      contribution: Math.round(sBranch * wBranch * 10) / 10,
    });

    // Core 4: Curriculum
    const sCurriculum = c.curriculumScore * 10;
    const wCurriculum = weights.CURRICULUM || 0;
    factorContributions.push({
      factor: "CURRICULUM",
      label: "Curriculum & Faculty standards",
      score: Math.round(sCurriculum),
      weight: Math.round(wCurriculum * 100) / 100,
      contribution: Math.round(sCurriculum * wCurriculum * 10) / 10,
    });

    // Core 5: ROI (min-max normalization with floor at 30, ceiling at 100)
    const currentRoiRatio = (c.avgSalary || 450000) / (c.tuitionFeeAnnual * 4);
    const roiRange = maxRoi - minRoi;
    const sRoi =
      roiRange > 0 ? 30 + ((currentRoiRatio - minRoi) / roiRange) * 70 : 75;
    const wRoi = weights.ROI || 0;
    factorContributions.push({
      factor: "ROI",
      label: "Return on Investment (ROI)",
      score: Math.round(sRoi),
      weight: Math.round(wRoi * 100) / 100,
      contribution: Math.round(sRoi * wRoi * 10) / 10,
    });

    // Custom Attributes Calculation
    config.customScoringAttributes.forEach((attr) => {
      const rawVal =
        collegeMeta[attr.key] !== undefined ? collegeMeta[attr.key] : attr.defaultValue;
      const score = Math.min(100, Math.max(0, Number(rawVal)));
      const weight = weights[attr.key.toUpperCase()] || 0;

      factorContributions.push({
        factor: attr.key.toUpperCase(),
        label: attr.label,
        score: Math.round(score),
        weight: Math.round(weight * 100) / 100,
        contribution: Math.round(score * weight * 10) / 10,
      });
    });

    // Career Goal Extra Dimensions Calculation
    extras.forEach((extra) => {
      let rawScore = 0;

      if (extra.computation === "placement_percentage" && c.placementPercentage != null) {
        rawScore = Math.min(100, Math.max(0, c.placementPercentage));
      } else if (extra.computation === "highest_salary" && c.highestSalary != null) {
        rawScore = Math.min(100, Math.max(0, (c.highestSalary / 5000000) * 100));
      } else if (extra.metadataKey && extra.source === "college_metadata") {
        rawScore = Math.min(100, Math.max(0, Number(collegeMeta[extra.metadataKey]) || 0));
      } else if (extra.metadataKey && extra.source === "branch_metadata") {
        rawScore = Math.min(100, Math.max(0, Number(branchMeta[extra.metadataKey]) || 0));
      }

      const weight = weights[extra.key] || 0;
      factorContributions.push({
        factor: extra.key,
        label: extra.label,
        score: Math.round(rawScore),
        weight: Math.round(weight * 100) / 100,
        contribution: Math.round(rawScore * weight * 10) / 10,
      });
    });

    // Base Score = Sum of all contributions
    const baseScoreVal = factorContributions.reduce((sum, item) => sum + item.contribution, 0);

    // --- STAGE 5: BONUSES ---
    const appliedBonuses: AppliedModifier[] = [];
    let bonusSum = 0;

    config.bonusRules.forEach((rule) => {
      if (rule.type === "IS_PARTNER" && c.isPartner) {
        bonusSum += rule.bonus;
        appliedBonuses.push({
          id: rule.id,
          type: "BONUS",
          value: rule.bonus,
          reason: rule.reason,
        });
      } else if (
        rule.type === "PLACEMENT_AVERAGE" &&
        c.avgSalary &&
        rule.threshold &&
        c.avgSalary >= rule.threshold
      ) {
        bonusSum += rule.bonus;
        appliedBonuses.push({
          id: rule.id,
          type: "BONUS",
          value: rule.bonus,
          reason: rule.reason,
        });
      } else if (rule.type === "CUSTOM_ATTRIBUTE" && rule.attributeKey) {
        const hasAttr = collegeMeta[rule.attributeKey] !== undefined;
        if (hasAttr && Number(collegeMeta[rule.attributeKey]) >= (rule.threshold || 0)) {
          bonusSum += rule.bonus;
          appliedBonuses.push({
            id: rule.id,
            type: "BONUS",
            value: rule.bonus,
            reason: rule.reason,
          });
        }
      }
    });

    // Final score sum
    const totalPenalty = budgetPenaltyVal + academicPenaltyVal;
    const rawFinalScore = baseScoreVal + bonusSum - totalPenalty;
    const finalScoreVal = Math.max(0, Math.min(100, rawFinalScore));

    // Generate explainability text highlights
    const keyReasons: string[] = [];

    // Career Goal based reason
    if (careerGoal !== "NOT_SURE") {
      const goalLabels: Record<string, string> = {
        PLACEMENT: "placement-focused",
        STARTUP: "startup/entrepreneurship",
        HIGHER_STUDIES_INDIA: "higher studies in India",
        HIGHER_STUDIES_ABROAD: "studying abroad",
        GOVERNMENT_EXAMS: "government exam preparation",
      };
      const goalLabel = goalLabels[careerGoal] || careerGoal.toLowerCase();
      if (careerGoal === "PLACEMENT" && c.placementScore >= 8.5) {
        keyReasons.push(`Excellent fit for your ${goalLabel} goal — outstanding placements`);
      } else if (careerGoal === "STARTUP" && Number(collegeMeta.startup_ecosystem) >= 7) {
        keyReasons.push(`Strong ${goalLabel} ecosystem at this college`);
      } else if (
        (careerGoal === "HIGHER_STUDIES_INDIA" || careerGoal === "HIGHER_STUDIES_ABROAD") &&
        Number(collegeMeta.research_output) >= 7
      ) {
        keyReasons.push(`Strong research environment for ${goalLabel}`);
      } else if (careerGoal === "GOVERNMENT_EXAMS" && sRoi >= 80) {
        keyReasons.push(`High ROI — cost-effective for ${goalLabel} preparation`);
      }
    }

    // Priority based reason
    if (topPriority === "PLACEMENTS" && c.placementScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Outstanding placements");
    } else if (topPriority === "ROI" && sRoi >= 80) {
      keyReasons.push("Matches your #1 priority: High ROI value");
    }

    if (c.isPartner) {
      keyReasons.push("Direct admission referral support via partner link");
    }

    appliedBonuses.forEach((b) => {
      keyReasons.push(b.reason);
    });

    if (keyReasons.length === 0) {
      keyReasons.push("Strong balanced scores across all categories");
    }

    results.push({
      collegeId: c.id,
      name: c.name,
      slug: c.slug,
      state: c.state,
      city: c.city,
      logoUrl: c.logoUrl,
      coverImageUrl: c.coverImageUrl,
      officialApplyUrl: c.officialApplyUrl,
      website: c.website,
      isPartner: c.isPartner,

      branchName: c.branchName,
      branchCode: c.branchCode,
      matchScore: Math.round(finalScoreVal * 10) / 10,
      rankPosition: 0,

      feeInfo: {
        annualTuition: c.tuitionFeeAnnual,
        annualHostel: c.hostelFeeAnnual,
        total4YrCost: total4YrCost,
      },

      placementInfo: {
        avgSalary: c.avgSalary,
        medianSalary: c.medianSalary,
        highestSalary: c.highestSalary,
        placementPercentage: c.placementPercentage,
      },

      admissionCompetitiveness: {
        category,
        badgeText,
      },

      keyReasons: keyReasons.slice(0, 3),
      scoreBreakdown: {
        baseScore: Math.round(baseScoreVal * 10) / 10,
        factorContributions: factorContributions,
        appliedBonuses: appliedBonuses,
        appliedPenalties: appliedPenalties,
        finalScore: Math.round(finalScoreVal * 10) / 10,
      },
    });
  }

  // Sort descending with tie-breaking
  return results
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.placementInfo.placementPercentage !== a.placementInfo.placementPercentage) {
        return (b.placementInfo.placementPercentage || 0) - (a.placementInfo.placementPercentage || 0);
      }
      if (b.placementInfo.avgSalary !== a.placementInfo.avgSalary) {
        return (b.placementInfo.avgSalary || 0) - (a.placementInfo.avgSalary || 0);
      }
      if (a.feeInfo.total4YrCost !== b.feeInfo.total4YrCost) {
        return a.feeInfo.total4YrCost - b.feeInfo.total4YrCost;
      }
      if (a.isPartner !== b.isPartner) return a.isPartner ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((item, idx) => {
      item.rankPosition = idx + 1;
      return item;
    });
}