"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./results.module.css";
import { BRANCH_OPTIONS, normalizeBranchCode } from "@/lib/branches";
import baseCollegesData from "@/lib/base-colleges.json";

interface Recommendation {
  id: string;
  matchScore: number;
  qualityScore: number;
  admissionProbability: number;
  rankPosition: number;
  branchCode: string;
  reasons: string;
  admissionCompetitiveness?: {
    category: "Dream" | "Target" | "Safe" | "Out of Reach";
    badgeText: string;
    jeeGap: number | null;
  };
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    isNewGen: boolean;
    branches: Array<{
      branchCode: string;
      branchName: string;
      tuitionFeeAnnual: number;
      hostelFeeAnnual: number;
      avgSalary: number | null;
      medianSalary: number | null;
      highestSalary: number | null;
      minJeePercentileCutoff: number | null;
      minClass12Cutoff: number | null;
      placementPercentage: number | null;
    }>;
  };
  scoreBreakdown?: {
    baseScore: number;
    factorContributions: Array<{
      factor: string;
      label: string;
      score: number;
      weight: number;
      contribution: number;
    }>;
    appliedBonuses: Array<{
      id: string;
      type: "BONUS" | "PENALTY";
      value: number;
      reason: string;
    }>;
    appliedPenalties: Array<{
      id: string;
      type: "BONUS" | "PENALTY";
      value: number;
      reason: string;
    }>;
    finalScore: number;
  };
}

interface QuizAnswers {
  careerGoal: string;
  jeePercentile: number | null;
  class12Percentage: number | null;
  budgetLimit: number | null;
  isBudgetConstraint: boolean;
  restrictLocation: boolean;
  selectedLocations: Array<{ state: string; city: string }>;
  priorities: Array<{ criteria: string; rankOrder: number }>;
  preferredBranches: string[];
}

interface ResultsClientProps {
  student: {
    id: string;
    name: string;
    jeePercentile: number | null;
    class12Percentage: number | null;
    budgetLimit: number | null;
    isBudgetConstraint: boolean;
    restrictLocation: boolean;
    careerGoal: string;
    locations: Array<{ state: string; city: string }>;
    priorities: Array<{ criteria: string; rankOrder: number }>;
  };
  recommendations: Recommendation[];
}

type SortMode = "best_fit" | "admission_chance" | "all";

const CAREER_GOALS = [
  { value: "PLACEMENT", label: "Get Placed" },
  { value: "STARTUP", label: "Start a Startup" },
  { value: "HIGHER_STUDIES", label: "Higher Studies" },
  { value: "NOT_SURE", label: "Not Sure Yet" },
];

const PRIORITY_CRITERIA = [
  "PLACEMENTS",
  "CURRICULUM",
  "CAMPUS_LIFE",
  "RESEARCH",
  "EXTRACURRICULARS",
];

const PRIORITY_LABELS: Record<string, string> = {
  PLACEMENTS: "Placements & Salaries",
  CURRICULUM: "Modern Course Standards",
  CAMPUS_LIFE: "Campus Life & Crowd",
  RESEARCH: "Startup ecosystem",
  EXTRACURRICULARS: "Extracurricular Activities and Sports",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
  "Tamil Nadu", "Telangana", "Uttarakhand", "Uttar Pradesh", "West Bengal",
];



export default function ResultsClient({
  student,
  recommendations: initialRecommendations,
}: ResultsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("best_fit");
  const [admissionFilter, setAdmissionFilter] = useState({ high: true, medium: true, low: false });
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  const toggleBreakdown = (recId: string) => {
    setExpandedBreakdowns(prev => ({ ...prev, [recId]: !prev[recId] }));
  };

  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({
    careerGoal: student.careerGoal,
    jeePercentile: student.jeePercentile,
    class12Percentage: student.class12Percentage,
    budgetLimit: student.budgetLimit,
    isBudgetConstraint: student.isBudgetConstraint,
    restrictLocation: student.restrictLocation,
    selectedLocations: student.locations,
    priorities: student.priorities.length > 0
      ? student.priorities
      : PRIORITY_CRITERIA.map((c, i) => ({ criteria: c, rankOrder: i + 1 })),
    preferredBranches: BRANCH_OPTIONS.map((b) => b.code),
  });

  const updateQuiz = useCallback((partial: Partial<QuizAnswers>) => {
    setQuizAnswers((prev) => {
      const next = { ...prev, ...partial };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        regenerate(next);
      }, 600);
      return next;
    });
  }, []);

  const regenerate = async (answers: QuizAnswers) => {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/recommendations/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, quizData: answers }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error("Regeneration failed:", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleBranch = (code: string) => {
    const current = quizAnswers.preferredBranches;
    const normalized = current.map((b) => normalizeBranchCode(b));
    if (normalized.includes(normalizeBranchCode(code))) {
      const next = current.filter((b) => normalizeBranchCode(b) !== normalizeBranchCode(code));
      if (next.length > 0) updateQuiz({ preferredBranches: next });
    } else {
      updateQuiz({ preferredBranches: [...current, code] });
    }
  };

  const addLocation = (state: string) => {
    if (!state) return;
    const exists = quizAnswers.selectedLocations.some((l) => l.state === state);
    if (!exists) {
      updateQuiz({ selectedLocations: [...quizAnswers.selectedLocations, { state, city: "" }] });
    }
  };

  const removeLocation = (idx: number) => {
    const next = quizAnswers.selectedLocations.filter((_, i) => i !== idx);
    updateQuiz({ selectedLocations: next });
  };

  const movePriority = (idx: number, dir: -1 | 1) => {
    const next = [...quizAnswers.priorities];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    const temp = next[idx];
    next[idx] = next[swapIdx];
    next[swapIdx] = temp;
    next[idx] = { ...next[idx], rankOrder: idx + 1 };
    next[swapIdx] = { ...next[swapIdx], rankOrder: swapIdx + 1 };
    updateQuiz({ priorities: next });
  };

  const enriched = useMemo(() => {
    return recommendations.map((rec) => {
      let prob = typeof rec.admissionProbability === "number" ? rec.admissionProbability : 50;
      if (typeof rec.admissionProbability === "string") {
        const s = (rec.admissionProbability as string).toUpperCase();
        if (s.includes("SAFE") || s.includes("HIGH")) prob = 85;
        else if (s.includes("TARGET") || s.includes("MED")) prob = 60;
        else if (s.includes("DREAM") || s.includes("REACH") || s.includes("LOW")) prob = 25;
      }
      
      const category = rec.admissionCompetitiveness?.category || (prob >= 75 ? "Safe" : prob >= 35 ? "Target" : "Dream");
      return { ...rec, category, admissionProb: prob };
    });
  }, [recommendations]);

  const filtered = useMemo(() => {
    let result = enriched;

    // Check admission probability checkbox filters
    if (!admissionFilter.high || !admissionFilter.medium || !admissionFilter.low) {
      const allowed: string[] = [];
      if (admissionFilter.high) allowed.push("Safe");
      if (admissionFilter.medium) allowed.push("Target");
      if (admissionFilter.low) allowed.push("Dream", "Reach", "Out of Reach");
      result = result.filter((r) => allowed.includes(r.category));
    }

    return [...result].sort((a, b) => {
      if (sortMode === "admission_chance") return b.admissionProb - a.admissionProb;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });
  }, [enriched, sortMode, admissionFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [sortMode, admissionFilter, recommendations]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage]);

  const bucketCounts = useMemo(() => {
    const counts = { Dream: 0, Target: 0, Safe: 0 };
    enriched.forEach((r) => { counts[r.category as keyof typeof counts]++; });
    return counts;
  }, [enriched]);

  const [categoryTab, setCategoryTab] = useState<"all" | "generic" | "new_gen">("all");

  const fixedMasterRanking = useMemo(() => {
    return [...(baseCollegesData as any[])].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }, []);

  const genericList = useMemo(() => {
    return filtered
      .filter((r) => !r.college?.isNewGen)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [filtered]);

  const newGenList = useMemo(() => {
    return filtered
      .filter((r) => Boolean(r.college?.isNewGen))
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [filtered]);

  const renderCard = (rec: any, idx: number, isNewGenCard = false) => {
    const branch = rec.college?.branches?.find((b: any) => b.branchCode === rec.branchCode) ||
      rec.college?.branches?.[0] || {
        branchCode: rec.branchCode || "CSE",
        branchName: "Computer Science & Engineering",
        tuitionFeeAnnual: (rec as any).feeInfo?.annualTuition || 250000,
        hostelFeeAnnual: (rec as any).feeInfo?.annualHostel || 100000,
        avgSalary: (rec as any).placementInfo?.avgSalary || 900000,
        minJeePercentileCutoff: 85,
      };

    let reasonsList: string[] = [];
    try { reasonsList = JSON.parse(rec.reasons); } catch { reasonsList = [String(rec.reasons)]; }

    const bucketClass = rec.category === "Dream" || (rec.category as string) === "Out of Reach"
      ? styles.badgeDream
      : rec.category === "Safe"
      ? styles.badgeSafe
      : styles.badgeTarget;
    const applyRedirectUrl = `/api/leads/apply?student_id=${student.id}&college_id=${rec.college.id}&branch_code=${rec.branchCode}`;

    return (
      <div key={rec.id} className={styles.collegeCard} style={isNewGenCard ? { borderColor: "#C4A484", background: "#fcfbf9" } : {}}>
        <div className={styles.cardHeader}>
          <div className={styles.collegeMeta}>
            <span className={styles.rankBadge}>#{idx + 1}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className={styles.collegeName}>{rec.college.name}</h2>
                {rec.college.isNewGen && (
                  <span style={{ background: "#0F2D52", color: "#FFFAF0", padding: "0.15rem 0.5rem", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700 }}>
                    🚀 New-Gen AI
                  </span>
                )}
              </div>
              <p className={styles.collegeLocation}>{rec.college.city}, {rec.college.state}</p>
            </div>
          </div>
          <div className={styles.scoresRow}>
            <div className={styles.scoreBlock}>
              <div className={styles.scoreLabel}>Match</div>
              <div className={styles.scoreVal}>{Number(rec.matchScore).toFixed(0)}%</div>
            </div>
            <div className={styles.scoreBlock}>
              <div className={styles.scoreLabel}>Admission</div>
              <div className={styles.scoreValSmall}>{rec.admissionProb}%</div>
            </div>
            <div className={styles.bucketBadgeWrapper}>
              <span className={`${styles.bucketBadge} ${bucketClass}`}>{rec.category}</span>
            </div>
          </div>
        </div>

        <div className={styles.branchBox}>
          <span className={styles.branchBadge}>{branch.branchCode}</span>
          <span className={styles.branchTitle}>{branch.branchName}</span>
        </div>

        {rec.scoreBreakdown && (
          <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <button
              onClick={() => toggleBreakdown(rec.id)}
              className="btn"
              style={{
                background: "transparent",
                color: "#0F2D52",
                border: "1px solid #e5e3dc",
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              {expandedBreakdowns[rec.id] ? "Hide Calculation Breakdown ▴" : "Show Calculation Breakdown ▾"}
            </button>
            
            {expandedBreakdowns[rec.id] && (
              <div className={styles.scoreBreakdownContainer}>
                <div className={styles.breakdownHeader}>
                  <span>🧮 Score Calculation Breakdown</span>
                </div>
                <div className={styles.breakdownGrid}>
                  {rec.scoreBreakdown.factorContributions?.map((contrib: any) => (
                    <div key={contrib.factor} className={styles.breakdownRow}>
                      <span className={styles.factorName}>{contrib.label}</span>
                      <span className={styles.factorValue}>
                        Score: <strong>{contrib.score}</strong> × Wt: <strong>{contrib.weight.toFixed(3)}</strong> = <strong>+{contrib.contribution.toFixed(1)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
                
                {rec.scoreBreakdown.appliedBonuses?.length > 0 && (
                  <div className={styles.modifiersSection}>
                    <div className={styles.modifierTitle}>🎁 Applied Bonuses:</div>
                    {rec.scoreBreakdown.appliedBonuses.map((bonus: any, bidx: number) => (
                      <div key={bidx} className={styles.modifierRow}>
                        <span className={styles.bonusBadge}>+{bonus.value}</span>
                        <span className={styles.modifierReason}>{bonus.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.cardFooter}>
          <div className={styles.reasonsList}>
            {reasonsList.map((reason, ri) => (
              <div key={ri} className={styles.reasonItem}>{reason}</div>
            ))}
          </div>
          <div className={styles.actionBtn}>
            <a href={applyRedirectUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}>
              Apply Official Link
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <Link href="/" className={styles.logo}>CollegeMatch</Link>
          <div className={styles.headerRight}>
            {isRegenerating && <span className={styles.regeneratingBadge}>Updating...</span>}
            <div className={styles.studentBadge}>{student.name}</div>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ─── SIDEBAR ──────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            {/* RECOMMENDATION MODE */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Recommendation Mode</h3>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name="sortMode" checked={sortMode === "best_fit"}
                    onChange={() => setSortMode("best_fit")} />
                  <span>Best Fit</span>
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="sortMode" checked={sortMode === "admission_chance"}
                    onChange={() => setSortMode("admission_chance")} />
                  <span>Admission Chance</span>
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name="sortMode" checked={sortMode === "all"}
                    onChange={() => setSortMode("all")} />
                  <span>All</span>
                </label>
              </div>
            </div>

            {/* ADMISSION PROBABILITY */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Admission Probability</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={admissionFilter.high}
                    onChange={(e) => setAdmissionFilter((p) => ({ ...p, high: e.target.checked }))} />
                  <span>Safe ({bucketCounts.Safe})</span>
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={admissionFilter.medium}
                    onChange={(e) => setAdmissionFilter((p) => ({ ...p, medium: e.target.checked }))} />
                  <span>Target ({bucketCounts.Target})</span>
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={admissionFilter.low}
                    onChange={(e) => setAdmissionFilter((p) => ({ ...p, low: e.target.checked }))} />
                  <span>Dream ({bucketCounts.Dream})</span>
                </label>
              </div>
            </div>

            {/* CAREER GOAL */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Career Goal</h3>
              <div className={styles.radioGroup}>
                {CAREER_GOALS.map((g) => (
                  <label key={g.value} className={styles.radioLabel}>
                    <input type="radio" name="careerGoal"
                      checked={quizAnswers.careerGoal === g.value}
                      onChange={() => updateQuiz({ careerGoal: g.value })} />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* JEE / CLASS 12 */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Academic Profile</h3>
              <div className={styles.inputRow}>
                <label>JEE Percentile</label>
                <input type="number" min="0" max="100" step="0.1"
                  value={quizAnswers.jeePercentile ?? ""}
                  onChange={(e) => updateQuiz({ jeePercentile: e.target.value ? Number(e.target.value) : null })}
                  className={styles.sidebarInput} />
              </div>
              <div className={styles.inputRow}>
                <label>Class 12 %</label>
                <input type="number" min="0" max="100" step="0.1"
                  value={quizAnswers.class12Percentage ?? ""}
                  onChange={(e) => updateQuiz({ class12Percentage: e.target.value ? Number(e.target.value) : null })}
                  className={styles.sidebarInput} />
              </div>
            </div>

            {/* BUDGET */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Budget Limit</h3>
              <div className={styles.checkboxGroup} style={{ marginBottom: "0.75rem" }}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={!quizAnswers.isBudgetConstraint}
                    onChange={(e) => updateQuiz({ isBudgetConstraint: !e.target.checked })}
                  />
                  <span style={{ fontWeight: 600, color: "#0F2D52" }}>🔓 Any Budget (No Limit)</span>
                </label>
              </div>

              {quizAnswers.isBudgetConstraint && (
                <>
                  <div className={styles.budgetDisplay}>
                    {quizAnswers.budgetLimit ? `₹${(quizAnswers.budgetLimit / 100000).toFixed(1)} Lakhs` : "No limit"}
                  </div>
                  <input type="range" min="400000" max="4000000" step="100000"
                    value={quizAnswers.budgetLimit || 1500000}
                    onChange={(e) => updateQuiz({ budgetLimit: Number(e.target.value), isBudgetConstraint: true })}
                    className={styles.budgetSlider} />
                </>
              )}
            </div>

            {/* PREFERRED BRANCHES */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Engineering Branches</h3>
              <div className={styles.checkboxGroup}>
                {BRANCH_OPTIONS.map((b) => {
                  const isChecked = quizAnswers.preferredBranches.some(
                    (pb) => normalizeBranchCode(pb) === normalizeBranchCode(b.code)
                  );
                  return (
                    <label key={b.code} className={styles.checkLabel}>
                      <input type="checkbox" checked={isChecked}
                        onChange={() => toggleBranch(b.code)} />
                      <span>{b.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* PREFERRED LOCATIONS */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Locations</h3>
              <div className={styles.checkboxGroup} style={{ marginBottom: "0.75rem" }}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={quizAnswers.restrictLocation}
                    onChange={(e) => updateQuiz({ restrictLocation: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600 }}>Restrict to selected states</span>
                </label>
              </div>

              <select
                className={styles.sidebarSelect}
                onChange={(e) => {
                  if (e.target.value) {
                    addLocation(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>+ Add State Filter</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              {quizAnswers.selectedLocations.length > 0 && (
                <div className={styles.tagsContainer}>
                  {quizAnswers.selectedLocations.map((loc, idx) => (
                    <span key={idx} className={styles.tag}>
                      {loc.state}
                      <button onClick={() => removeLocation(idx)} className={styles.tagRemove}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* PRIORITIES REORDER */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Priorities Ranking</h3>
              <p style={{ fontSize: "0.75rem", color: "#8c8c8c", marginBottom: "0.5rem" }}>
                Rank 1 gets 33.3% weight, Rank 5 gets 6.6% weight
              </p>
              <div className={styles.priorityList}>
                {quizAnswers.priorities.map((p, idx) => (
                  <div key={p.criteria} className={styles.priorityItem}>
                    <span className={styles.priorityRank}>#{idx + 1}</span>
                    <span className={styles.priorityName}>{PRIORITY_LABELS[p.criteria] || p.criteria}</span>
                    <div className={styles.priorityBtns}>
                      <button disabled={idx === 0} onClick={() => movePriority(idx, -1)}
                        className={styles.reorderBtn}>▲</button>
                      <button disabled={idx === quizAnswers.priorities.length - 1}
                        onClick={() => movePriority(idx, 1)} className={styles.reorderBtn}>▼</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ────────────────────────────── */}
        <main className={styles.mainContent}>
          <div className={styles.resultsHeader}>
            <h1 className={styles.title}>Your Recommendations</h1>
            <p className={styles.subtitle}>
              {filtered.length} results {" · "} Budget: {" "}
              <strong>
                {quizAnswers.isBudgetConstraint && quizAnswers.budgetLimit
                  ? `₹${(quizAnswers.budgetLimit / 100000).toFixed(1)}L`
                  : "No Limit"}
              </strong>
            </p>

            {/* ─── CATEGORY TABS ─── */}
            <div className={styles.categoryTabsWrapper}>
              <button
                className={`${styles.categoryTab} ${categoryTab === "all" ? styles.categoryTabActive : ""}`}
                onClick={() => setCategoryTab("all")}
              >
                <span>🌐 All Matches</span>
                <span className={styles.categoryCountBadge}>{filtered.length}</span>
              </button>
              <button
                className={`${styles.categoryTab} ${categoryTab === "new_gen" ? styles.categoryTabActive : ""}`}
                onClick={() => setCategoryTab("new_gen")}
              >
                <span>🚀 Next-Gen AI & Tech</span>
                <span className={styles.categoryCountBadge}>{newGenList.length}</span>
              </button>
              <button
                className={`${styles.categoryTab} ${categoryTab === "generic" ? styles.categoryTabActive : ""}`}
                onClick={() => setCategoryTab("generic")}
              >
                <span>🏫 Generic Colleges</span>
                <span className={styles.categoryCountBadge}>{genericList.length}</span>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No matches found</h3>
              <p>Try adjusting your filters or preferences in the sidebar.</p>
            </div>
          ) : (
            <div className={styles.separateBoxesContainer}>
              {/* ─── 0. ALL MATCHES / COMBINED TOP RECOMMENDATIONS ─── */}
              {categoryTab === "all" && (
                <div style={{ marginBottom: "2.5rem" }}>
                  <div className={styles.sectionHeader} style={{ marginBottom: "1rem" }}>
                    <div className={styles.sectionHeaderLeft}>
                      <h2 className={styles.sectionTitle}>
                        🏆 Top Overall Recommendations
                      </h2>
                      <p className={styles.sectionSubtitle}>
                        All colleges ranked together by your personalized match score (highest to lowest).
                      </p>
                    </div>
                    <span style={{ background: "#0F2D52", color: "#FFFAF0", padding: "0.35rem 0.85rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                      {filtered.length} Total Matches
                    </span>
                  </div>

                  <div className={styles.resultsList}>
                    {paginated.map((rec, idx) => renderCard(rec, (currentPage - 1) * pageSize + idx, Boolean(rec.college?.isNewGen)))}
                  </div>

                  {/* Pagination for All Matches */}
                  {filtered.length > pageSize && (
                    <div className={styles.pagination} style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
                      <button
                        onClick={() => {
                          setCurrentPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        className={styles.pageBtn}
                      >
                        ← Previous Page
                      </button>
                      <span className={styles.pageInfo}>
                        Page <strong>{currentPage}</strong> of {Math.ceil(filtered.length / pageSize)}
                      </span>
                      <button
                        onClick={() => {
                          setCurrentPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={currentPage === Math.ceil(filtered.length / pageSize)}
                        className={styles.pageBtn}
                      >
                        Next Page →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── 1. NEW-GEN COLLEGES SECTION ─── */}
              {(categoryTab === "all" || categoryTab === "new_gen") && (
                <div className={styles.newGenSectionBox} style={{ marginTop: categoryTab === "all" ? "2.5rem" : "0" }}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <h2 className={styles.sectionTitle}>
                        🚀 1. New-Gen Colleges
                      </h2>
                      <p className={styles.sectionSubtitle}>
                        Colleges offering practical project-first curriculum, Gen AI labs, industry mentorship, and modern tech pedagogy.
                      </p>
                    </div>
                    <span className={styles.newGenHighlightBadge}>
                      ✨ {newGenList.length} New-Gen Colleges
                    </span>
                  </div>

                  {newGenList.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#8c8c8c", fontStyle: "italic" }}>
                      No New-Gen Colleges match your active filters.
                    </div>
                  ) : (
                    <div className={styles.resultsList}>
                      {newGenList.map((rec, idx) => renderCard(rec, idx, true))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── 2. GENERIC OVERALL RANKING SECTION (FIXED RIGID MASTER LIST) ─── */}
              {(categoryTab === "all" || categoryTab === "generic") && (
                <div className={styles.categorySectionBox}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <h2 className={styles.sectionTitle}>
                        🏫 2. Generic Overall Ranking
                      </h2>
                      <p className={styles.sectionSubtitle}>
                        Fixed master ranking of all {fixedMasterRanking.length} colleges in India (including New-Gen institutes), strictly sorted from Rank #1 to #{fixedMasterRanking.length} unaffected by quiz inputs.
                      </p>
                    </div>
                    <span style={{ background: "#f4eee2", color: "#0F2D52", padding: "0.35rem 0.85rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                      {fixedMasterRanking.length} Colleges (Fixed Master Ranking)
                    </span>
                  </div>

                  <div className={styles.resultsList}>
                    {fixedMasterRanking.map((col: any) => {
                      const branch = col.branches?.[0] || {
                        branchCode: "CSE",
                        branchName: "Computer Science & Engineering",
                        tuitionFeeAnnual: 250000,
                        hostelFeeAnnual: 100000,
                        avgSalary: 900000,
                        minJeePercentileCutoff: 85,
                      };

                      return (
                        <div key={col.id || col.slug} className={styles.collegeCard}>
                          <div className={styles.cardHeader}>
                            <div className={styles.collegeMeta}>
                              <span className={styles.rankBadge}>#{col.rank || 1}</span>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <h2 className={styles.collegeName}>{col.name}</h2>
                                  {col.isNewGen && (
                                    <span style={{ background: "#0F2D52", color: "#FFFAF0", padding: "0.15rem 0.5rem", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700 }}>
                                      🚀 New-Gen AI
                                    </span>
                                  )}
                                </div>
                                <p className={styles.collegeLocation}>{col.city}, {col.state}</p>
                              </div>
                            </div>
                            <div className={styles.scoresRow}>
                              <div className={styles.scoreBlock}>
                                <div className={styles.scoreLabel}>Placement</div>
                                <div className={styles.scoreVal}>{col.placementScore}/10</div>
                              </div>
                              <div className={styles.scoreBlock}>
                                <div className={styles.scoreLabel}>Academics</div>
                                <div className={styles.scoreValSmall}>{col.curriculumScore}/10</div>
                              </div>
                              <div className={styles.scoreBlock}>
                                <div className={styles.scoreLabel}>Campus</div>
                                <div className={styles.scoreValSmall}>{col.collegeLifeScore}/10</div>
                              </div>
                            </div>
                          </div>

                          <div className={styles.branchBox}>
                            <span className={styles.branchBadge}>{branch.branchCode || "CSE"}</span>
                            <span className={styles.branchTitle}>{branch.branchName || "Computer Science & Engineering"}</span>
                            {branch.avgSalary > 0 && (
                              <span style={{ marginLeft: "auto", fontSize: "0.85rem", fontWeight: 600, color: "#0F2D52" }}>
                                Avg: ₹{(branch.avgSalary / 100000).toFixed(1)} LPA
                              </span>
                            )}
                          </div>

                          <div className={styles.cardFooter}>
                            <div className={styles.reasonsList}>
                              <div className={styles.reasonItem}>Fixed Master Ranking: Rank #{col.rank} in India</div>
                              {branch.minJeePercentileCutoff > 0 && (
                                <div className={styles.reasonItem}>JEE Equivalent Cutoff: {branch.minJeePercentileCutoff}%ile</div>
                              )}
                              {branch.tuitionFeeAnnual > 0 && (
                                <div className={styles.reasonItem}>Tuition: ₹{(branch.tuitionFeeAnnual / 100000).toFixed(1)}L/yr</div>
                              )}
                            </div>
                            <div className={styles.actionBtn}>
                              <a
                                href={col.officialApplyUrl || col.website || "https://collegematch.in"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                                style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}
                              >
                                Apply Official Link
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
