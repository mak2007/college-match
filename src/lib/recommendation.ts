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

/**
 * Pure mathematical scoring model based on 5 ranked categories and 1 career goal
 */
export interface CollegeScoreInput {
  C_Placement: number;
  C_Academics: number;
  C_CampusLife: number;
  C_Startup: number;
  C_Extra: number;
}

export type PriorityCategory = "C_Placement" | "C_Academics" | "C_CampusLife" | "C_Startup" | "C_Extra";
export type CareerGoalChoice = "Get Placed" | "Start a Startup" | "Higher Studies" | "Not Sure Yet" | "PLACEMENT" | "STARTUP" | "HIGHER_STUDIES" | "NOT_SURE";

export function calculateCollegeScore(
  college: CollegeScoreInput,
  userRankedCategories: PriorityCategory[],
  careerGoal: CareerGoalChoice
): { Base_Score: number; Goal_Bonus: number; Final_Score: number } {
  // Rank weights (0.333, 0.266, 0.200, 0.133, 0.066)
  const weights = [0.333, 0.266, 0.200, 0.133, 0.066];

  let Base_Score = 0;
  userRankedCategories.slice(0, 5).forEach((cat, index) => {
    const score = college[cat] || 0;
    const w = weights[index] || 0;
    Base_Score += score * w;
  });

  // Target Category Edge Bonus
  let targetCategoryScore = (college.C_Placement + college.C_Academics + college.C_CampusLife + college.C_Startup + college.C_Extra) / 5;

  const normalizedGoal = careerGoal.toUpperCase();
  if (normalizedGoal === "GET PLACED" || normalizedGoal === "PLACEMENT") {
    targetCategoryScore = college.C_Placement;
  } else if (normalizedGoal === "START A STARTUP" || normalizedGoal === "STARTUP") {
    targetCategoryScore = college.C_Startup;
  } else if (normalizedGoal === "HIGHER STUDIES" || normalizedGoal === "HIGHER_STUDIES") {
    targetCategoryScore = college.C_Academics;
  }

  let Goal_Bonus = 0;
  if (targetCategoryScore >= 90) {
    Goal_Bonus = 5;
  } else if (targetCategoryScore >= 80) {
    Goal_Bonus = 2.5;
  } else {
    Goal_Bonus = 0;
  }

  const Final_Score = Math.min(100, Math.round((Base_Score + Goal_Bonus) * 10) / 10);

  return {
    Base_Score: Math.round(Base_Score * 10) / 10,
    Goal_Bonus,
    Final_Score,
  };
}

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

    // ==========================================
    // 1. THE 5 VARIABLES (College Data: 0 - 100)
    // ==========================================
    const C_Placement = Math.min(100, Math.max(0, (Number(c.placementScore) || 8.5) * 10));
    const C_Academics = Math.min(100, Math.max(0, (Number(c.curriculumScore) || 8.0) * 10));
    const C_CampusLife = Math.min(100, Math.max(0, (Number(c.collegeLifeScore) || 8.0) * 10));

    let startupVal = Number(collegeMeta.startup_ecosystem) || 8.0;
    if (startupVal <= 10) startupVal *= 10;
    const C_Startup = Math.min(100, Math.max(0, startupVal));

    let extraVal = Number(collegeMeta.sports_extracurricular || collegeMeta.infra_rating) || 8.0;
    if (extraVal <= 10) extraVal *= 10;
    const C_Extra = Math.min(100, Math.max(0, extraVal));

    const categoryMap: Record<string, { label: string; score: number }> = {
      PLACEMENTS: { label: "Placements & Salaries", score: C_Placement },
      CURRICULUM: { label: "Modern Course Standards (Academics)", score: C_Academics },
      CAMPUS_LIFE: { label: "Campus Life & Crowd", score: C_CampusLife },
      RESEARCH: { label: "Startup Ecosystem", score: C_Startup },
      EXTRACURRICULARS: { label: "Extracurricular Activities and Sports", score: C_Extra },
    };

    // ==========================================
    // 2. THE BASE MATH: RANK-SUM METHOD
    // ==========================================
    const RANK_WEIGHTS = [0.333, 0.266, 0.200, 0.133, 0.066];
    const sortedPriorities = [...(student.priorities || [])].sort((a, b) => a.rankOrder - b.rankOrder);
    const defaultPriorityKeys = ["PLACEMENTS", "CURRICULUM", "CAMPUS_LIFE", "RESEARCH", "EXTRACURRICULARS"];

    let baseScoreVal = 0;
    const factorContributions: FactorContribution[] = [];

    for (let pIdx = 0; pIdx < 5; pIdx++) {
      const priorityObj = sortedPriorities[pIdx];
      const key = priorityObj ? priorityObj.criteria.toUpperCase() : defaultPriorityKeys[pIdx];
      const cat = categoryMap[key] || categoryMap[defaultPriorityKeys[pIdx]];
      const weight = RANK_WEIGHTS[pIdx];
      const contribution = cat.score * weight;
      baseScoreVal += contribution;

      factorContributions.push({
        factor: key,
        label: cat.label,
        score: Math.round(cat.score),
        weight: weight,
        contribution: Math.round(contribution * 10) / 10,
      });
    }

    baseScoreVal = Math.round(baseScoreVal * 10) / 10;

    // ==========================================
    // 3. THE BONUS MATH: TARGET CATEGORY EDGE
    // ==========================================
    let targetScore = (C_Placement + C_Academics + C_CampusLife + C_Startup + C_Extra) / 5;
    let targetCategoryLabel = "Overall 5-Category Average";

    const goal = (student.careerGoal || "NOT_SURE").toUpperCase();
    if (goal === "PLACEMENT" || goal === "GET PLACED") {
      targetScore = C_Placement;
      targetCategoryLabel = "Placements (C_Placement)";
    } else if (goal === "STARTUP" || goal === "START A STARTUP") {
      targetScore = C_Startup;
      targetCategoryLabel = "Startup Ecosystem (C_Startup)";
    } else if (goal === "HIGHER_STUDIES" || goal === "HIGHER STUDIES") {
      targetScore = C_Academics;
      targetCategoryLabel = "Academics & Curriculum (C_Academics)";
    }

    let goalBonus = 0;
    if (targetScore >= 90) {
      goalBonus = 5;
    } else if (targetScore >= 80) {
      goalBonus = 2.5;
    } else {
      goalBonus = 0;
    }

    const appliedBonuses: AppliedModifier[] = [];
    if (goalBonus > 0) {
      appliedBonuses.push({
        id: "target_category_edge",
        type: "BONUS",
        value: goalBonus,
        reason: `Target Category Edge: ${targetCategoryLabel} score of ${Math.round(targetScore)}/100 grants +${goalBonus} bonus points`,
      });
    }

    // ==========================================
    // 4. FINAL CALCULATION
    // ==========================================
    const finalScoreVal = Math.min(100, Math.max(0, Math.round((baseScoreVal + goalBonus - budgetPenaltyVal) * 10) / 10));

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