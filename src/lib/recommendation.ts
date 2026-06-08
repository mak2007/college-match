// Configurable & Explainable Recommendation Engine Logic for CollegeMatch

export interface StudentProfile {
  jeePercentile?: number | null;
  class12Percentage?: number | null;
  budgetLimit?: number | null;
  isBudgetConstraint: boolean;
  restrictLocation: boolean;
  preferredLocations: { state: string; city: string }[];
  priorities: { criteria: string; rankOrder: number }[]; // 1 to 5
  preferredBranches: string[];
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
  isPartner: boolean;
  commissionRate: number;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  metadata: string | null; // College-level custom attributes JSON string
  
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
  branchMetadata: string | null; // Branch-level custom attributes JSON string
}

export interface ScoringConfig {
  weightStrategy: "ROC" | "EQUAL" | "MANUAL";
  manualWeights: {
    PLACEMENTS: number;
    ROI: number;
    BRANCH_STRENGTH: number;
    COLLEGE_LIFE: number;
    CURRICULUM: number;
  };
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
  score: number;        // Normalized score of college for this factor (0-100)
  weight: number;       // Applied weight (0.0 - 1.0)
  contribution: number; // score * weight
}

export interface AppliedModifier {
  id: string;
  type: "BONUS" | "PENALTY";
  value: number;
  reason: string;
}

export interface MatchScoreBreakdown {
  baseScore: number;                 // Sum of all factor contributions
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
  };
  
  admissionCompetitiveness: {
    category: "Safe" | "Target" | "Reach" | "Unlikely";
    badgeText: string;
  };
  
  keyReasons: string[];
  scoreBreakdown: MatchScoreBreakdown;
}

// 1. Calculate Weights dynamically based on strategy configuration
export function getWeights(
  priorities: { criteria: string; rankOrder: number }[],
  config: ScoringConfig
): Record<string, number> {
  const weights: Record<string, number> = {};

  if (config.weightStrategy === "MANUAL") {
    // Use manual weights from configuration
    Object.entries(config.manualWeights).forEach(([key, val]) => {
      weights[key.toUpperCase()] = val;
    });
  } else if (config.weightStrategy === "EQUAL") {
    // Equal weighting for 5 core criteria
    const CORE_CRITERIA = ["PLACEMENTS", "ROI", "BRANCH_STRENGTH", "COLLEGE_LIFE", "CURRICULUM"];
    CORE_CRITERIA.forEach((key) => {
      weights[key] = 0.20;
    });
  } else {
    // Default to ROC Centroid Strategy for core criteria
    const sorted = [...priorities].sort((a, b) => a.rankOrder - b.rankOrder);
    const ROC_WEIGHTS = [0.4567, 0.2567, 0.1567, 0.0900, 0.0400];
    
    sorted.forEach((p, idx) => {
      weights[p.criteria.toUpperCase()] = ROC_WEIGHTS[idx] || 0.04;
    });
  }

  // Factor in custom attributes weights if defined
  let totalCoreWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let totalCustomWeight = config.customScoringAttributes.reduce((sum, attr) => sum + attr.weight, 0);
  
  // Normalize everything to sum to exactly 1.0
  const scaleFactor = 1.0 / (totalCoreWeight + totalCustomWeight);
  
  Object.keys(weights).forEach((key) => {
    weights[key] = weights[key] * scaleFactor;
  });

  config.customScoringAttributes.forEach((attr) => {
    weights[attr.key.toUpperCase()] = attr.weight * scaleFactor;
  });

  return weights;
}

// 2. Main Configurable Recommendation Scoring Algorithm
export function generateRecommendations(
  student: StudentProfile,
  candidates: CollegeCandidate[],
  config: ScoringConfig
): MatchResult[] {
  if (candidates.length === 0) return [];
  
  // Pre-calculate ROI ranges for normalization
  const roiRatios = candidates.map(c => {
    const total4YrTuition = c.tuitionFeeAnnual * 4;
    const avgSal = c.avgSalary || 450000;
    return total4YrTuition > 0 ? avgSal / total4YrTuition : 0;
  });
  
  const maxRoi = Math.max(...roiRatios, 0.1);
  const minRoi = Math.min(...roiRatios, maxRoi);
  
  // Calculate dynamic normalized weights
  const weights = getWeights(student.priorities, config);
  const topPriority = student.priorities.find(p => p.rankOrder === 1)?.criteria.toUpperCase() || "PLACEMENTS";
  
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
        loc => loc.state.toLowerCase() === c.state.toLowerCase() && 
               (!loc.city || loc.city.toLowerCase() === c.city.toLowerCase())
      );
      if (!isLocationMatched) continue; // Skip completely
    }
    
    // --- STAGE 2: BUDGET PENALTY ---
    let budgetPenaltyVal = 0;
    const appliedPenalties: AppliedModifier[] = [];
    
    if (config.budgetPenalty.active && student.isBudgetConstraint && student.budgetLimit) {
      const limit = student.budgetLimit;
      const multiplier = config.budgetPenalty.thresholdMultiplier; // default 1.3
      
      if (total4YrCost > multiplier * limit) {
        continue; // Exceeds upper limit threshold -> Filter out completely
      } else if (total4YrCost > limit) {
        // Dynamic budget penalty calculation: ((Cost - Limit) / (Range))^exponent * baseWeight
        const range = (multiplier - 1.0) * limit;
        budgetPenaltyVal = Math.pow((total4YrCost - limit) / range, config.budgetPenalty.exponent) * config.budgetPenalty.basePenaltyWeight;
        appliedPenalties.push({
          id: "budget_overrun",
          type: "PENALTY",
          value: Math.round(budgetPenaltyVal * 10) / 10,
          reason: `Total cost (₹${(total4YrCost/100000).toFixed(1)}L) exceeds budget limit (₹${(limit/100000).toFixed(1)}L)`
        });
      }
    }
    
    // --- STAGE 3: ACADEMIC FIT & PENALTY ---
    let academicPenaltyVal = 0;
    let category: "Safe" | "Target" | "Reach" | "Unlikely" = "Target";
    let badgeText = "Good Fit";
    
    const jeeGap = student.jeePercentile && c.minJeePercentileCutoff
      ? student.jeePercentile - c.minJeePercentileCutoff
      : null;
      
    const c12Gap = student.class12Percentage && c.minClass12Cutoff
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
        continue; // Exceeds eligibility gap limit -> Filter out completely
      } else if (bestGap < activeLimits.unlikelyThreshold) {
        category = "Unlikely";
        badgeText = "Competitiveness: Unlikely";
        academicPenaltyVal = Math.abs(bestGap) * activeLimits.unlikelyPenaltyScale;
        appliedPenalties.push({
          id: "academic_unlikely",
          type: "PENALTY",
          value: Math.round(academicPenaltyVal * 10) / 10,
          reason: `Academic score gap of ${bestGap.toFixed(1)} is below target cutoff thresholds`
        });
      } else if (bestGap < activeLimits.reachThreshold) {
        category = "Reach";
        badgeText = "Competitiveness: Reach";
        academicPenaltyVal = Math.abs(bestGap) * activeLimits.reachPenaltyScale;
        appliedPenalties.push({
          id: "academic_reach",
          type: "PENALTY",
          value: Math.round(academicPenaltyVal * 10) / 10,
          reason: `Academic score gap of ${bestGap.toFixed(1)} requires competitive reach admissions`
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
      contribution: Math.round(sPlacement * wPlacement * 10) / 10
    });
    
    // Core 2: College Life
    const sLife = c.collegeLifeScore * 10;
    const wLife = weights.COLLEGE_LIFE || 0;
    factorContributions.push({
      factor: "COLLEGE_LIFE",
      label: "Campus life & hostels",
      score: Math.round(sLife),
      weight: Math.round(wLife * 100) / 100,
      contribution: Math.round(sLife * wLife * 10) / 10
    });
    
    // Core 3: Branch Strength
    const sBranch = c.branchStrengthScore * 10;
    const wBranch = weights.BRANCH_STRENGTH || 0;
    factorContributions.push({
      factor: "BRANCH_STRENGTH",
      label: `${c.branchCode} department strength`,
      score: Math.round(sBranch),
      weight: Math.round(wBranch * 100) / 100,
      contribution: Math.round(sBranch * wBranch * 10) / 10
    });
    
    // Core 4: Curriculum
    const sCurriculum = c.curriculumScore * 10;
    const wCurriculum = weights.CURRICULUM || 0;
    factorContributions.push({
      factor: "CURRICULUM",
      label: "Curriculum & Faculty standards",
      score: Math.round(sCurriculum),
      weight: Math.round(wCurriculum * 100) / 100,
      contribution: Math.round(sCurriculum * wCurriculum * 10) / 10
    });
    
    // Core 5: ROI
    const currentRoiRatio = (c.avgSalary || 450000) / (c.tuitionFeeAnnual * 4);
    const range = maxRoi - minRoi;
    const sRoi = range > 0
      ? 30 + ((currentRoiRatio - minRoi) / range) * 70
      : 75;
    const wRoi = weights.ROI || 0;
    factorContributions.push({
      factor: "ROI",
      label: "Return on Investment (ROI)",
      score: Math.round(sRoi),
      weight: Math.round(wRoi * 100) / 100,
      contribution: Math.round(sRoi * wRoi * 10) / 10
    });
    
    // Custom Attributes Calculation
    config.customScoringAttributes.forEach((attr) => {
      // Check if attribute key exists in college level metadata
      const rawVal = collegeMeta[attr.key] !== undefined ? collegeMeta[attr.key] : attr.defaultValue;
      
      // Let's assume custom scores are already on a scale of 0-100.
      const score = Math.min(100, Math.max(0, Number(rawVal)));
      const weight = weights[attr.key.toUpperCase()] || 0;
      
      factorContributions.push({
        factor: attr.key.toUpperCase(),
        label: attr.label,
        score: Math.round(score),
        weight: Math.round(weight * 100) / 100,
        contribution: Math.round(score * weight * 10) / 10
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
          reason: rule.reason
        });
      } else if (rule.type === "PLACEMENT_AVERAGE" && c.avgSalary && rule.threshold && c.avgSalary >= rule.threshold) {
        bonusSum += rule.bonus;
        appliedBonuses.push({
          id: rule.id,
          type: "BONUS",
          value: rule.bonus,
          reason: rule.reason
        });
      } else if (rule.type === "CUSTOM_ATTRIBUTE" && rule.attributeKey) {
        const hasAttr = collegeMeta[rule.attributeKey] !== undefined;
        if (hasAttr && Number(collegeMeta[rule.attributeKey]) >= (rule.threshold || 0)) {
          bonusSum += rule.bonus;
          appliedBonuses.push({
            id: rule.id,
            type: "BONUS",
            value: rule.bonus,
            reason: rule.reason
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
    
    if (topPriority === "PLACEMENTS" && c.placementScore >= 8.5) {
      keyReasons.push("Matches your #1 priority: Outstanding placements");
    } else if (topPriority === "ROI" && sRoi >= 80) {
      keyReasons.push("Matches your #1 priority: High ROI value");
    }
    
    if (c.isPartner) {
      keyReasons.push("Direct admission referral support via partner link");
    }
    
    // Append any bonuses as highlights
    appliedBonuses.forEach(b => {
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
      isPartner: c.isPartner,
      
      branchName: c.branchName,
      branchCode: c.branchCode,
      matchScore: Math.round(finalScoreVal * 10) / 10,
      rankPosition: 0, // Assigned later after sorting
      
      feeInfo: {
        annualTuition: c.tuitionFeeAnnual,
        annualHostel: c.hostelFeeAnnual,
        total4YrCost: total4YrCost
      },
      
      placementInfo: {
        avgSalary: c.avgSalary,
        medianSalary: c.medianSalary,
        highestSalary: c.highestSalary
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
        finalScore: Math.round(finalScoreVal * 10) / 10
      }
    });
  }
  
  // Sort descending and map positions
  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((item, idx) => {
      item.rankPosition = idx + 1;
      return item;
    });
}
