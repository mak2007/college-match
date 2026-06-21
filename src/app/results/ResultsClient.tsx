"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import styles from "./results.module.css";
import { BRANCH_OPTIONS, normalizeBranchCode } from "@/lib/branches";

interface Recommendation {
  id: string;
  matchScore: number;
  qualityScore: number;
  admissionProbability: number;
  rankPosition: number;
  branchCode: string;
  reasons: string;
  admissionCompetitiveness?: {
    category: "Dream" | "Target" | "Safe";
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

type SortMode = "best_fit" | "admission_chance";

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
  RESEARCH: "Research and Opportunities",
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
  const [admissionFilter, setAdmissionFilter] = useState({ high: true, medium: true, low: true });
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
    console.log("Enriching recommendations:", recommendations.length);
    return recommendations.map((rec) => {
      const branch = rec.college?.branches?.find((b) => b.branchCode === rec.branchCode);
      const category = rec.admissionProbability >= 70 ? "Safe" : rec.admissionProbability >= 35 ? "Target" : "Dream";
      return { ...rec, category, admissionProb: rec.admissionProbability ?? 0 };
    });
  }, [recommendations]);

  const filtered = useMemo(() => {
    const allChecked = admissionFilter.high && admissionFilter.medium && admissionFilter.low;
    let result = enriched;

    if (!allChecked) {
      const allowed: string[] = [];
      if (admissionFilter.high) allowed.push("Safe");
      if (admissionFilter.medium) allowed.push("Target");
      if (admissionFilter.low) allowed.push("Dream");
      result = enriched.filter((r) => allowed.includes(r.category));
    }

    return result.sort((a, b) => {
      if (sortMode === "admission_chance") return b.admissionProb - a.admissionProb;
      return b.matchScore - a.matchScore;
    });
  }, [enriched, sortMode, admissionFilter]);

  const bucketCounts = useMemo(() => {
    const counts = { Dream: 0, Target: 0, Safe: 0 };
    enriched.forEach((r) => { counts[r.category as keyof typeof counts]++; });
    return counts;
  }, [enriched]);

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
                <label>Class 12 % (Eligibility)</label>
                <input type="number" min="0" max="100" step="0.1"
                  value={quizAnswers.class12Percentage ?? ""}
                  onChange={(e) => updateQuiz({ class12Percentage: e.target.value ? Number(e.target.value) : null })}
                  className={styles.sidebarInput} />
              </div>
            </div>

            {/* BUDGET */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Budget (4-Year Total)</h3>
              <label className={styles.checkLabel} style={{ marginBottom: "0.5rem" }}>
                <input type="checkbox" checked={quizAnswers.isBudgetConstraint}
                  onChange={(e) => updateQuiz({ isBudgetConstraint: e.target.checked })} />
                <span>Enable budget limit</span>
              </label>
              {quizAnswers.isBudgetConstraint && (
                <div className={styles.inputRow}>
                  <label>Max Budget</label>
                  <input type="number" min="0" step="100000"
                    value={quizAnswers.budgetLimit ?? ""}
                    onChange={(e) => updateQuiz({ budgetLimit: e.target.value ? Number(e.target.value) : null })}
                    className={styles.sidebarInput}
                    placeholder="e.g. 800000" />
                </div>
              )}
            </div>

            {/* BRANCHES — hidden in V1 (CSE only) */}
            {BRANCH_OPTIONS.length > 1 && (
              <div className={styles.sidebarSection}>
                <h3 className={styles.sidebarSectionTitle}>Branches</h3>
                <div className={styles.checkboxGroup}>
                  {BRANCH_OPTIONS.map((b) => (
                    <label key={b.code} className={styles.checkLabel}>
                      <input type="checkbox"
                        checked={quizAnswers.preferredBranches.some(
                          (pb) => normalizeBranchCode(pb) === normalizeBranchCode(b.code)
                        )}
                        onChange={() => toggleBranch(b.code)} />
                      <span>{b.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* PRIORITIES */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Priorities (drag to reorder)</h3>
              <div className={styles.priorityList}>
                {quizAnswers.priorities.map((p, idx) => (
                  <div key={p.criteria} className={styles.priorityItem}>
                    <span className={styles.priorityRank}>{idx + 1}</span>
                    <span className={styles.priorityName}>{PRIORITY_LABELS[p.criteria.toUpperCase()] || p.criteria}</span>
                    <div className={styles.priorityArrows}>
                      <button onClick={() => movePriority(idx, -1)} disabled={idx === 0} className={styles.arrowBtn}>&#9650;</button>
                      <button onClick={() => movePriority(idx, 1)} disabled={idx === quizAnswers.priorities.length - 1} className={styles.arrowBtn}>&#9660;</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LOCATION */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>Location Preference</h3>
              <label className={styles.checkLabel} style={{ marginBottom: "0.5rem" }}>
                <input type="checkbox" checked={quizAnswers.restrictLocation}
                  onChange={(e) => updateQuiz({ restrictLocation: e.target.checked })} />
                <span>Restrict to preferred states</span>
              </label>
              {quizAnswers.restrictLocation && (
                <>
                  <select className={styles.sidebarSelect}
                    onChange={(e) => { addLocation(e.target.value); e.target.value = ""; }}>
                    <option value="">Add a state...</option>
                    {INDIAN_STATES.filter((s) => !quizAnswers.selectedLocations.some((l) => l.state === s)).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div className={styles.tagList}>
                    {quizAnswers.selectedLocations.map((loc, idx) => (
                      <span key={idx} className={styles.tag}>
                        {loc.state}
                        <button onClick={() => removeLocation(idx)} className={styles.tagRemove}>&times;</button>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* COLLEGE TYPE */}
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarSectionTitle}>College Type</h3>
              <p className={styles.sidebarHint}>All colleges are shown. Filter by New Gen in results.</p>
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
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No matches found</h3>
              <p>Try adjusting your filters or preferences in the sidebar.</p>
            </div>
          ) : (
            <div className={styles.resultsList}>
              {filtered.map((rec, idx) => {
                console.log("Rendering rec:", rec.id, rec.college?.name, rec.category);
                const branch = rec.college?.branches?.find((b) => b.branchCode === rec.branchCode);
                if (!branch) {
                  console.warn("Missing branch for rec:", rec.id, rec.branchCode);
                  return null;
                }

                let reasonsList: string[] = [];
                try { reasonsList = JSON.parse(rec.reasons); } catch { reasonsList = [String(rec.reasons)]; }

                const total4YrCost = (branch.tuitionFeeAnnual + branch.hostelFeeAnnual) * 4;
                const bucketClass = rec.category === "Dream" ? styles.badgeDream
                  : rec.category === "Safe" ? styles.badgeSafe : styles.badgeTarget;
                const applyRedirectUrl = `/api/leads/apply?student_id=${student.id}&college_id=${rec.college.id}&branch_code=${rec.branchCode}`;

                return (
                  <div key={rec.id} className={styles.collegeCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.collegeMeta}>
                        <span className={styles.rankBadge}>#{idx + 1}</span>
                        <div>
                          <h2 className={styles.collegeName}>{rec.college.name}</h2>
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

                    <div className={styles.cardGrid}>
                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>Placements</h4>
                        <div className={styles.statRow}>
                          <span>Average Package:</span>
                          <strong>₹{branch.avgSalary ? (Number(branch.avgSalary) / 100000).toFixed(2) : "N/A"} LPA</strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Median Package:</span>
                          <strong>₹{branch.medianSalary ? (Number(branch.medianSalary) / 100000).toFixed(2) : "N/A"} LPA</strong>
                        </div>
                        {branch.highestSalary && (
                          <div className={styles.statRow}>
                            <span>Highest Package:</span>
                            <strong>₹{(Number(branch.highestSalary) / 100000).toFixed(2)} LPA</strong>
                          </div>
                        )}
                      </div>
                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>4-Year Financials</h4>
                        <div className={styles.statRow}>
                          <span>Annual Tuition:</span>
                          <strong>₹{branch.tuitionFeeAnnual ? (Number(branch.tuitionFeeAnnual) / 100000).toFixed(2) : "N/A"} L</strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Annual Hostel:</span>
                          <strong>₹{branch.hostelFeeAnnual ? (Number(branch.hostelFeeAnnual) / 100000).toFixed(2) : "N/A"} L</strong>
                        </div>
                        <div className={styles.totalRow}>
                          <span>Est. Total Cost:</span>
                          <strong>₹{(total4YrCost / 100000).toFixed(2)} Lakh</strong>
                        </div>
                      </div>
                      <div className={styles.gridSection} style={{ borderRight: "none" }}>
                        <h4 className={styles.sectionTitle}>Admission Criteria</h4>
                        <p className={styles.cutoffSubtext}>
                          JEE Main: {branch.minJeePercentileCutoff ? `≥ ${branch.minJeePercentileCutoff} percentile` : "N/A"}<br />
                          Eligibility: {branch.minClass12Cutoff ? `Class 12 ≥ ${branch.minClass12Cutoff}%` : "N/A"}
                        </p>
                      </div>
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
                              {rec.scoreBreakdown.factorContributions?.map((contrib) => (
                                <div key={contrib.factor} className={styles.breakdownRow}>
                                  <span className={styles.factorName}>{contrib.label}</span>
                                  <span className={styles.factorValue}>
                                    Score: <strong>{contrib.score}</strong> × Wt: <strong>{contrib.weight.toFixed(2)}</strong> = <strong>+{contrib.contribution.toFixed(1)}</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            {rec.scoreBreakdown.appliedBonuses?.length > 0 && (
                              <div className={styles.modifiersSection}>
                                <div className={styles.modifierTitle}>🎁 Applied Bonuses:</div>
                                {rec.scoreBreakdown.appliedBonuses.map((bonus, idx) => (
                                  <div key={idx} className={styles.modifierRow}>
                                    <span className={styles.bonusBadge}>+{bonus.value}</span>
                                    <span className={styles.modifierReason}>{bonus.reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {rec.scoreBreakdown.appliedPenalties?.length > 0 && (
                              <div className={styles.modifiersSection}>
                                <div className={styles.modifierTitle}>⚠️ Applied Penalties:</div>
                                {rec.scoreBreakdown.appliedPenalties.map((penalty, idx) => (
                                  <div key={idx} className={styles.modifierRow}>
                                    <span className={styles.penaltyBadge}>-{penalty.value}</span>
                                    <span className={styles.modifierReason}>{penalty.reason}</span>
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
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
