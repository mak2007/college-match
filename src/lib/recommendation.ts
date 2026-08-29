// Configurable & Explainable Recommendation Engine Logic for CollegeMatch
import { normalizeBranchCode, SUPPORTED_BRANCH_CODES, CSE_VARIANTS } from "@/lib/branches";

export type CareerGoalType =
  | "PLACEMENT"
  | "STARTUP"
  | "HIGHER_STUDIES"
  | "NOT_SURE";

export type RecommendationMode = "best_fit" | "admission_chance";

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
  isNewGen: boolean;
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
  isNewGen: boolean;

  branchName: string;
  branchCode: string;
  qualityScore: number;
  matchScore: number;
  admissionProbability: number;
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
    category: "Dream" | "Target" | "Safe" | "Out of Reach";
    badgeText: string;
    jeeGap: number | null;
  };

  keyReasons: string[];
  scoreBreakdown: MatchScoreBreakdown;
}

const DEFAULT_CAREER_GOAL_WEIGHTS: Record<CareerGoalType, CareerGoalWeights> = {
  PLACEMENT: {
    PLACEMENTS: 0.40,
    ROI: 0.20,
    BRANCH_STRENGTH: 0.15,
    COLLEGE_LIFE: 0.10,
    CURRICULUM: 0.15,
  },
  STARTUP: {
    PLACEMENTS: 0.10,
    ROI: 0.10,
    BRANCH_STRENGTH: 0.20,
    COLLEGE_LIFE: 0.15,
    CURRICULUM: 0.45,
  },
  HIGHER_STUDIES: {
    PLACEMENTS: 0.05,
    ROI: 0.12,
    BRANCH_STRENGTH: 0.15,
    COLLEGE_LIFE: 0.13,
    CURRICULUM: 0.55,
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
      weight: 0.15,
      source: "branch_metadata",
      computation: "placement_percentage",
    },
  ],
  STARTUP: [
    {
      key: "STARTUP_ECOSYSTEM",
      label: "Startup ecosystem & incubation",
      weight: 0.15,
      source: "college_metadata",
      metadataKey: "startup_ecosystem",
    },
  ],
  HIGHER_STUDIES: [
    {
      key: "RESEARCH_OUTPUT",
      label: "Research output & publications",
      weight: 0.10,
      source: "college_metadata",
      metadataKey: "research_output",
    },
    {
      key: "EXPOSURE_SCORE",
      label: "Industry & internship exposure",
      weight: 0.05,
      source: "college_metadata",
      metadataKey: "exposure_score",
    },
  ],
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

// ── Admission Probability: Sigmoid / Logistic Curve ──────────────────────────
// Replaces all hard if/else blocks with a smooth continuous curve.
// Formula: P = 100 / (1 + exp(-k * (UserPercentile - Cutoff)))
// Steepness k = 0.8 gives a smooth S-curve centered at the cutoff.

export type AdmissionCategory = "Safe" | "Target" | "Dream" | "Out of Reach" | "Unknown";

export interface AdmissionResult {
  probability: number | null;    // 0-100, rounded to nearest integer
  category: AdmissionCategory;
}

const SIGMOID_K = 0.8;

export function calculateAdmissionProbability(
  userPercentile: number | null | undefined,
  collegeCutoff: number | null | undefined
): AdmissionResult {
  // Edge case: missing cutoff data
  if (collegeCutoff == null) {
    return { probability: null, category: "Unknown" };
  }

  // Edge case: missing student percentile — can't calculate
  if (userPercentile == null) {
    return { probability: null, category: "Unknown" };
  }

  // Sigmoid: P = 100 / (1 + e^(-k * (user - cutoff)))
  const exponent = -SIGMOID_K * (userPercentile - collegeCutoff);
  const rawProbability = 100 / (1 + Math.exp(exponent));
  const probability = Math.round(rawProbability);

  // Category thresholds applied after sigmoid calculation
  let category: AdmissionCategory;
  if (probability >= 80) {
    category = "Safe";
  } else if (probability >= 40) {
    category = "Target";
  } else if (probability >= 10) {
    category = "Dream";
  } else {
    category = "Out of Reach";
  }

  return { probability, category };
}

// Category → badge text mapping
function admissionBadgeText(category: AdmissionCategory, probability: number | null): string {
  switch (category) {
    case "Safe":         return `Admission: Safe — strong chances (${probability}%)`;
    case "Target":       return `Admission: Target — good fit for your profile (${probability}%)`;
    case "Dream":        return `Admission: Dream — competitive, requires strong profile (${probability}%)`;
    case "Out of Reach": return `Admission: Out of Reach — very low chance (${probability}%)`;
    case "Unknown":      return "Admission: Unknown — cutoff data unavailable";
  }
}

const ENGINE_CRITERIA_MAP: Record<string, string> = {
  PLACEMENTS: "PLACEMENTS",
  CURRICULUM: "CURRICULUM",
  CAMPUS_LIFE: "COLLEGE_LIFE",
  RESEARCH: "BRANCH_STRENGTH",
  EXTRACURRICULARS: "COLLEGE_LIFE",
};

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
    const CORE_CRITERIA = ["PLACEMENTS", "ROI", "BRANCH_STRENGTH", "COLLEGE_LIFE", "CURRICULUM"];
    CORE_CRITERIA.forEach((key) => { weights[key] = 0.01; }); // small baseline
    sorted.forEach((p, idx) => {
      const criteria = p.criteria.toUpperCase();
      const mappedKey = ENGINE_CRITERIA_MAP[criteria] || criteria;
      if (weights[mappedKey] !== undefined) {
        weights[mappedKey] += ROC_WEIGHTS[idx] || 0.04;
      }
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
        const mappedKey = ENGINE_CRITERIA_MAP[criteria] || criteria;
        if (weights[mappedKey] !== undefined) {
          const rankFrom1 = p.rankOrder - 1;
          const adjustment = -rankFrom1 * boostPerRank;
          const clampedAdj = Math.max(-maxAdj, Math.min(maxAdj, adjustment));
          weights[mappedKey] = weights[mappedKey] * (1 + clampedAdj);
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
  const extras: CareerGoalExtraDimension[] = [];
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

// 3. Standalone Quality Score (objective, student-independent)
// Used for "Best Colleges" mode — ranks colleges by intrinsic quality only.
const QUALITY_WEIGHTS = {
  PLACEMENT: 0.25,
  CURRICULUM: 0.20,
  BRANCH_STRENGTH: 0.20,
  ROI: 0.15,
  EXPOSURE: 0.10,
  INFRA: 0.05,
  PLACEMENT_PCT: 0.05,
};

function computeQualityScore(
  c: CollegeCandidate,
  collegeMeta: Record<string, any>,
  total4YrCost: number,
  logRoiRange: number,
  minLogRoi: number
): number {
  // 1. Placement outcomes (0-100)
  const sPlacement = Math.min(100, Math.max(0, (Number(c.placementScore) || 8.5) * 10));

  // 2. Curriculum (0-100)
  const sCurriculum = Math.min(100, Math.max(0, (Number(c.curriculumScore) || 8.0) * 10));

  // 3. Branch strength (0-100)
  const sBranch = Math.min(100, Math.max(0, (Number(c.branchStrengthScore) || 8.5) * 10));

  // 4. ROI (log-scaled, 0-100)
  const effectiveCost = Math.max(200000, total4YrCost);
  const roiRatio = (c.avgSalary || 600000) / effectiveCost;
  const logRoi = Math.log(1 + roiRatio);
  const sRoi = logRoiRange > 0 ? Math.min(100, Math.max(30, 30 + ((logRoi - minLogRoi) / logRoiRange) * 70)) : 75;

  // 5. Exposure score (0-100, from metadata)
  const exposure = Math.min(100, Math.max(0, (Number(collegeMeta.exposure_score) || 5) * 10));

  // 6. Infrastructure (0-100, from metadata)
  const infra = Math.min(100, Math.max(0, Number(collegeMeta.infra_rating) || 50));

  // 7. Placement percentage (0-100)
  const placementPct = c.placementPercentage != null ? Math.min(100, Math.max(0, c.placementPercentage)) : 85;

  // Weighted sum
  const quality =
    sPlacement * QUALITY_WEIGHTS.PLACEMENT +
    sCurriculum * QUALITY_WEIGHTS.CURRICULUM +
    sBranch * QUALITY_WEIGHTS.BRANCH_STRENGTH +
    sRoi * QUALITY_WEIGHTS.ROI +
    exposure * QUALITY_WEIGHTS.EXPOSURE +
    infra * QUALITY_WEIGHTS.INFRA +
    placementPct * QUALITY_WEIGHTS.PLACEMENT_PCT;

  return Math.round(quality * 10) / 10;
}

// 4. Main Configurable Recommendation Scoring Algorithm
export function generateRecommendations(
  student: StudentProfile,
  candidates: CollegeCandidate[],
  config: ScoringConfig,
  mode: RecommendationMode = "best_fit"
): MatchResult[] {
  if (candidates.length === 0) return [];

  // V1: Only evaluate CSE variants (CSE, CSE_CAT1-4). IT/ECE deferred to V2/V3.
  candidates = candidates.filter((c) =>
    CSE_VARIANTS.includes(c.branchCode.toUpperCase().trim())
  );
  if (candidates.length === 0) return [];

  // Pre-calculate ROI ranges for normalization (log-scaled to compress extremes)
  const roiRatios = candidates.map((c) => {
    const total4YrCost = (c.tuitionFeeAnnual + c.hostelFeeAnnual) * 4;
    const avgSal = c.avgSalary || 450000;
    return total4YrCost > 0 ? avgSal / total4YrCost : 0;
  });

  const logRoiRatios = roiRatios.map((r) => Math.log(1 + r));
  const maxLogRoi = Math.max(...logRoiRatios, 0.1);
  const minLogRoi = Math.min(...logRoiRatios, maxLogRoi);

  // Calculate dynamic normalized weights
  const weights = getWeights(student.priorities, config, student.careerGoal);
  const topPriority =
    student.priorities.find((p) => p.rankOrder === 1)?.criteria.toUpperCase() || "PLACEMENTS";
  const careerGoal = student.careerGoal || "NOT_SURE";

  // Get extra dimensions for this career goal
  const extras: CareerGoalExtraDimension[] = [];

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

    if (config.budgetPenalty.active && student.isBudgetConstraint && student.budgetLimit && student.budgetLimit > 0) {
      const limit = student.budgetLimit;
      const multiplier = config.budgetPenalty.thresholdMultiplier || 1.5;

      if (total4YrCost > limit) {
        const range = Math.max(1, (multiplier - 1.0) * limit);
        budgetPenaltyVal =
          Math.pow(Math.min(multiplier * limit, total4YrCost - limit) / range, config.budgetPenalty.exponent || 2.0) *
          (config.budgetPenalty.basePenaltyWeight || 30.0);
        appliedPenalties.push({
          id: "budget_overrun",
          type: "PENALTY",
          value: Math.round(budgetPenaltyVal * 10) / 10,
          reason: `Total cost (₹${(total4YrCost / 100000).toFixed(1)}L) exceeds budget limit (₹${(limit / 100000).toFixed(1)}L)`,
        });
      }
    }

    // --- STAGE 3: ACADEMIC FIT (admission probability via sigmoid curve) ---
    // Calculate admission probability using sigmoid curve
    const admissionCalc = calculateAdmissionProbability(
      student.jeePercentile,
      c.minJeePercentileCutoff
    );

    // Map the sigmoid result to the engine's category type
    let category: "Dream" | "Target" | "Safe" | "Out of Reach" = "Target";
    let badgeText = "Good Fit";

    if (admissionCalc.probability !== null) {
      if (admissionCalc.category === "Out of Reach") {
        category = "Dream";
        badgeText = "Aspirational / Reach";
        appliedPenalties.push({
          id: "academic_reach",
          type: "PENALTY",
          value: 20.0,
          reason: `JEE cutoff (${c.minJeePercentileCutoff}%ile) is higher than current score`,
        });
      } else {
        category = admissionCalc.category as "Dream" | "Target" | "Safe" | "Out of Reach";
        badgeText = admissionBadgeText(admissionCalc.category, admissionCalc.probability);
      }
    }

    // Compute JEE gap for display purposes
    const jeeGap =
      student.jeePercentile && c.minJeePercentileCutoff
        ? student.jeePercentile - c.minJeePercentileCutoff
        : null;
    const bestGap = jeeGap;

    // --- STAGE 4: FACTOR SUB-SCORES (0-100) & CONTRIBUTIONS ---
    const factorContributions: FactorContribution[] = [];

    // Core 1: Placements
    const sPlacement = Math.min(100, Math.max(0, (Number(c.placementScore) || 8.5) * 10));
    const wPlacement = weights.PLACEMENTS || 0;
    factorContributions.push({
      factor: "PLACEMENTS",
      label: "Placement outcomes",
      score: Math.round(sPlacement),
      weight: Math.round(wPlacement * 100) / 100,
      contribution: Math.round(sPlacement * wPlacement * 10) / 10,
    });

    // Core 2: College Life
    const sLife = Math.min(100, Math.max(0, (Number(c.collegeLifeScore) || 8.0) * 10));
    const wLife = weights.COLLEGE_LIFE || 0;
    factorContributions.push({
      factor: "COLLEGE_LIFE",
      label: "Campus life & hostels",
      score: Math.round(sLife),
      weight: Math.round(wLife * 100) / 100,
      contribution: Math.round(sLife * wLife * 10) / 10,
    });

    // Core 3: Branch Strength
    const sBranch = Math.min(100, Math.max(0, (Number(c.branchStrengthScore) || 8.5) * 10));
    const wBranch = weights.BRANCH_STRENGTH || 0;
    factorContributions.push({
      factor: "BRANCH_STRENGTH",
      label: `${c.branchCode} department strength`,
      score: Math.round(sBranch),
      weight: Math.round(wBranch * 100) / 100,
      contribution: Math.round(sBranch * wBranch * 10) / 10,
    });

    // Core 4: Curriculum
    const sCurriculum = Math.min(100, Math.max(0, (Number(c.curriculumScore) || 8.0) * 10));
    const wCurriculum = weights.CURRICULUM || 0;
    factorContributions.push({
      factor: "CURRICULUM",
      label: "Curriculum & Faculty standards",
      score: Math.round(sCurriculum),
      weight: Math.round(wCurriculum * 100) / 100,
      contribution: Math.round(sCurriculum * wCurriculum * 10) / 10,
    });

    // Core 5: ROI (log-scaled normalization with floor at 30, ceiling at 100)
    const effective4YrCost = Math.max(200000, total4YrCost);
    const currentRoiRatio = (c.avgSalary || 600000) / effective4YrCost;
    const currentLogRoi = Math.log(1 + currentRoiRatio);
    const logRoiRange = maxLogRoi - minLogRoi;
    const sRoi =
      logRoiRange > 0 ? Math.min(100, Math.max(30, 30 + ((currentLogRoi - minLogRoi) / logRoiRange) * 70)) : 75;
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
        let valNum = Number(collegeMeta[extra.metadataKey]) || 0;
        if (valNum > 0 && valNum <= 10) {
          valNum = valNum * 10;
        }
        rawScore = Math.min(100, Math.max(0, valNum));
      } else if (extra.metadataKey && extra.source === "branch_metadata") {
        let valNum = Number(branchMeta[extra.metadataKey]) || 0;
        if (valNum > 0 && valNum <= 10) {
          valNum = valNum * 10;
        }
        rawScore = Math.min(100, Math.max(0, valNum));
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

    // Career Goal Modifiers: Provide a +5.0 bonus if the college excels in the student's chosen career focus.
    const goalUpper = student.careerGoal?.toUpperCase();
    if (goalUpper === "PLACEMENT") {
      if (c.placementScore > 8.0) {
        bonusSum += 5.0;
        appliedBonuses.push({
          id: "career_placement_focus",
          type: "BONUS",
          value: 5.0,
          reason: "Matches your career goal: Excellent placements (Placement Score > 8.0)"
        });
      }
    } else if (goalUpper === "STARTUP") {
      const startupEco = collegeMeta.startup_ecosystem ? Number(collegeMeta.startup_ecosystem) : 7.0;
      const scoreScale = startupEco <= 10 ? startupEco : startupEco / 10;
      if (scoreScale > 8.0) {
        bonusSum += 5.0;
        appliedBonuses.push({
          id: "career_startup_focus",
          type: "BONUS",
          value: 5.0,
          reason: "Matches your career goal: Strong entrepreneurship & startup ecosystem (Startup Score > 8.0)"
        });
      }
    } else if (goalUpper === "HIGHER_STUDIES") {
      const researchOut = collegeMeta.research_output ? Number(collegeMeta.research_output) : 7.0;
      const scoreScale = researchOut <= 10 ? researchOut : researchOut / 10;
      if (scoreScale > 8.0) {
        bonusSum += 5.0;
        appliedBonuses.push({
          id: "career_research_focus",
          type: "BONUS",
          value: 5.0,
          reason: "Matches your career goal: High academic research output & publications (Research Score > 8.0)"
        });
      }
    }

    // Final score = base + bonuses - budget penalty ONLY (no academic penalty)
    const totalPenalty = budgetPenaltyVal;
    const rawFinalScore = baseScoreVal + bonusSum - totalPenalty;
    const finalScoreVal = Math.max(0, Math.min(100, rawFinalScore));

    // Generate explainability text highlights
    const keyReasons: string[] = [];

    // Career Goal based reason
    if (careerGoal !== "NOT_SURE") {
      const goalLabels: Record<string, string> = {
        PLACEMENT: "placement-focused",
        STARTUP: "startup/entrepreneurship",
        HIGHER_STUDIES: "higher studies & research",
      };
      const goalLabel = goalLabels[careerGoal] || careerGoal.toLowerCase();
      if (careerGoal === "PLACEMENT" && c.placementScore >= 8.5) {
        keyReasons.push(`Excellent fit for your ${goalLabel} goal — outstanding placements`);
      } else if (careerGoal === "STARTUP" && Number(collegeMeta.startup_ecosystem) >= 7) {
        keyReasons.push(`Strong ${goalLabel} ecosystem at this college`);
      } else if (careerGoal === "HIGHER_STUDIES" && Number(collegeMeta.research_output) >= 7) {
        keyReasons.push(`Strong research environment for ${goalLabel}`);
      }
    }

    // Priority based reason
    if (topPriority === "PLACEMENTS" && c.placementScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Outstanding placements");
    } else if (topPriority === "CAMPUS_LIFE" && c.collegeLifeScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Excellent campus environment");
    } else if (topPriority === "EXTRACURRICULARS" && c.collegeLifeScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Excellent campus environment");
    } else if (topPriority === "RESEARCH" && Number(collegeMeta.research_output) >= 7) {
      keyReasons.push("Matches your #1 priority: Strong research focus");
    } else if (topPriority === "CURRICULUM" && c.curriculumScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Modern curriculum standards");
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

    // --- ADMISSION PROBABILITY (sigmoid-based, calculated in Stage 3) ---
    const admissionProb = admissionCalc.probability ?? 50;

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
      isNewGen: c.isNewGen,

      branchName: c.branchName,
      branchCode: c.branchCode,
      qualityScore: computeQualityScore(c, collegeMeta, total4YrCost, maxLogRoi - minLogRoi, minLogRoi),
      matchScore: Math.round(finalScoreVal * 10) / 10,
      admissionProbability: admissionProb,
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
        jeeGap: bestGap,
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

  // Sort based on mode
  const sorted = results.sort((a, b) => {
    if (mode === "admission_chance") {
      // Sort by admission probability descending
      if (b.admissionProbability !== a.admissionProbability) return b.admissionProbability - a.admissionProbability;
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.name.localeCompare(b.name);
    } else {
      // best_fit: sort by match score descending (personalized)
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
    }
  });

  // Enforce max 2 entries per college for diversity
  const collegeCount: Record<string, number> = {};
  const MAX_PER_COLLEGE = 2;
  const diverseResults: MatchResult[] = [];
  for (const item of sorted) {
    const count = collegeCount[item.name] || 0;
    if (count < MAX_PER_COLLEGE) {
      collegeCount[item.name] = count + 1;
      diverseResults.push(item);
    }
  }

  return diverseResults.map((item, idx) => {
    item.rankPosition = idx + 1;
    return item;
  });
}