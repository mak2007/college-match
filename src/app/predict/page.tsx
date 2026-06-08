"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./predict.module.css";
import Navbar from "@/components/Navbar";

interface MatchResult {
  id: string;
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
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  avgSalary: number | null;
  medianSalary: number | null;
  highestSalary: number | null;
  collegeLifeScore: number;
  admissionCompetitiveness: {
    category: "Safe" | "Target" | "Reach" | "Unlikely";
    badgeText: string;
  };
  keyReasons: string[];
  scoreBreakdown: {
    baseScore: number;
    penalties: number;
    bonuses: number;
    contributions: {
      PLACEMENTS: number;
      ROI: number;
      BRANCH_STRENGTH: number;
      COLLEGE_LIFE: number;
      CURRICULUM: number;
      [key: string]: number;
    };
  };
}

export default function Predictor() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);

  // Quiz Form states
  const [jeePercentile, setJeePercentile] = useState(90);
  const [class12Percentage, setClass12Percentage] = useState(85);
  const [budgetLimit, setBudgetLimit] = useState(1600000); // 16 Lakh total budget
  const [isBudgetConstraint, setIsBudgetConstraint] = useState(true);
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([
    "placements",
    "curriculum",
    "campus_life",
    "research",
    "extracurriculars"
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cm_predictor_progress");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.jeePercentile !== undefined) setJeePercentile(parsed.jeePercentile);
        if (parsed.class12Percentage !== undefined) setClass12Percentage(parsed.class12Percentage);
        if (parsed.budgetLimit !== undefined) setBudgetLimit(parsed.budgetLimit);
        if (parsed.isBudgetConstraint !== undefined) setIsBudgetConstraint(parsed.isBudgetConstraint);
        if (parsed.preferredBranches !== undefined) setPreferredBranches(parsed.preferredBranches);
        if (parsed.selectedRegions !== undefined) setSelectedRegions(parsed.selectedRegions);
        if (parsed.ranking !== undefined) setRanking(parsed.ranking);
      }
    } catch (e) {
      console.error("Error loading progress from localStorage", e);
    }
  }, []);

  // Save to localStorage when quiz values change
  useEffect(() => {
    if (step < 6) {
      const progress = {
        step,
        jeePercentile,
        class12Percentage,
        budgetLimit,
        isBudgetConstraint,
        preferredBranches,
        selectedRegions,
        ranking,
      };
      localStorage.setItem("cm_predictor_progress", JSON.stringify(progress));
    }
  }, [
    step,
    jeePercentile,
    class12Percentage,
    budgetLimit,
    isBudgetConstraint,
    preferredBranches,
    selectedRegions,
    ranking,
  ]);

  const handleNext = () => {
    if (step < 5) {
      setStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const resetQuiz = () => {
    localStorage.removeItem("cm_predictor_progress");
    setStep(1);
    setResults([]);
  };

  const handleBranchToggle = (branch: string) => {
    setPreferredBranches(prev =>
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Map ranking list to engine priorities
      const CRITERIA_MAPPING: Record<string, string> = {
        placements: "placements",
        extracurriculars: "roi",
        campus_life: "college_life",
        research: "branch_strength",
        curriculum: "curriculum"
      };

      const priorities = ranking.map((item, index) => ({
        criteria: CRITERIA_MAPPING[item],
        rankOrder: index + 1
      }));

      // Map regions to states
      const REGION_MAP: Record<string, string[]> = {
        'South India': ['Karnataka', 'Tamil Nadu'],
        'North India': ['Punjab', 'Uttar Pradesh', 'Rajasthan'],
        'West India': ['Maharashtra'],
        'East India': ['Odisha'],
      };

      let statesToFilter: string[] = [];
      if (!selectedRegions.includes("Anywhere in India") && selectedRegions.length > 0) {
        selectedRegions.forEach(region => {
          if (REGION_MAP[region]) {
            statesToFilter.push(...REGION_MAP[region]);
          }
        });
      }
      setSelectedStates(statesToFilter);

      // Call matching API endpoint
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jeePercentile,
          class12Percentage,
          budgetLimit,
          isBudgetConstraint,
          restrictLocation: statesToFilter.length > 0,
          preferredLocations: statesToFilter.map(state => ({ state, city: "" })),
          preferredBranches,
          priorities
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.matches || []);
        localStorage.removeItem("cm_predictor_progress"); // Clear on completion
        setStep(6); // Show results view
      } else {
        alert("Engine failed to compute results: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error talking to matching engine.");
    } finally {
      setLoading(false);
    }
  };

  const STEP_LABELS = ["Academics", "Location", "Priorities", "Budget", "Branches"];

  const renderStepIndicator = () => {
    return (
      <div className={styles.stepIndicator}>
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;

          return (
            <div key={label} className={styles.stepSegment}>
              <div
                className={`${styles.stepCircle} ${
                  isActive ? styles.stepCircleActive : ""
                } ${isComplete ? styles.stepCircleComplete : ""}`}
              >
                {isComplete ? "✓" : stepNum}
              </div>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ""}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Quiz Step
  const renderQuizStep = () => {
    switch (step) {
      case 1: // Academic Performance
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Your Academic Profile</h2>
            <p className={styles.questionSubtitle}>Provide scores to calculate your target admissibility cutoff fit</p>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>JEE Percentile</span>
                <span style={{ color: "var(--brand-green)" }}>{jeePercentile}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="0.5"
                className={styles.sliderInput}
                value={jeePercentile}
                onChange={(e) => setJeePercentile(Number(e.target.value))}
              />
            </div>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>Class 12 Board Percentage</span>
                <span style={{ color: "var(--brand-green)" }}>{class12Percentage}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                className={styles.sliderInput}
                value={class12Percentage}
                onChange={(e) => setClass12Percentage(Number(e.target.value))}
              />
            </div>
          </div>
        );
      case 2: // Location Preference
        const regions = [
          { name: "My State Only", desc: "Restrict search to your home state" },
          { name: "South India", desc: "Karnataka, Tamil Nadu, etc." },
          { name: "North India", desc: "Punjab, Uttar Pradesh, Rajasthan, etc." },
          { name: "West India", desc: "Maharashtra, etc." },
          { name: "East India", desc: "Odisha, etc." },
          { name: "Anywhere in India", desc: "No location restrictions (Recommended)", prominent: true }
        ];

        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Where do you prefer to study?</h2>
            <p className={styles.questionSubtitle}>Select one or more regional preferences for your college campus</p>
            <div className={styles.optionsGrid}>
              {regions.map(r => {
                const isSelected = selectedRegions.includes(r.name);
                const isProminent = r.prominent;
                return (
                  <div
                    key={r.name}
                    className={`${styles.optionCard} ${isSelected ? styles.optionCardActive : ""} ${isProminent ? styles.optionCardProminent : ""}`}
                    onClick={() => {
                      if (r.name === "Anywhere in India") {
                        if (isSelected) {
                          setSelectedRegions([]);
                        } else {
                          setSelectedRegions(["Anywhere in India"]);
                        }
                      } else {
                        setSelectedRegions(prev => {
                          const filtered = prev.filter(item => item !== "Anywhere in India");
                          if (filtered.includes(r.name)) {
                            return filtered.filter(item => item !== r.name);
                          } else {
                            return [...filtered, r.name];
                          }
                        });
                      }
                    }}
                  >
                    <input type="checkbox" checked={isSelected} readOnly />
                    <span className={styles.optionTitle}>{r.name}</span>
                    <span className={styles.optionDesc}>{r.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 3: // Priorities Ranking
        const itemsMap = {
          placements: { label: "Placements & Salaries", icon: "💼", desc: "Top recruiters, package statistics, and career growth" },
          extracurriculars: { label: "Extracurricular activities and sports", icon: "⚽", desc: "Clubs, student chapters, athletic events, and active groups" },
          campus_life: { label: "Campus Life & crowd", icon: "🌴", desc: "Modern hostels, food courts, diverse student body, and events" },
          research: { label: "Research and opportunities", icon: "🔬", desc: "Academic projects, internships, patent support, and labs" },
          curriculum: { label: "Modern Course Standards", icon: "📖", desc: "Updated syllabus, industry readiness, and faculty standards" }
        };

        const moveItem = (index: number, direction: "up" | "down") => {
          const newRanking = [...ranking];
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < newRanking.length) {
            const temp = newRanking[index];
            newRanking[index] = newRanking[targetIndex];
            newRanking[targetIndex] = temp;
            setRanking(newRanking);
          }
        };

        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Rank Your Priorities</h2>
            <p className={styles.questionSubtitle}>Drag items or use the arrows to rank from Most Important (1st) to Least Important (5th)</p>
            
            <div className={styles.rankingList}>
              {ranking.map((itemId, idx) => {
                const item = itemsMap[itemId as keyof typeof itemsMap];
                if (!item) return null;
                const rankNum = idx + 1;
                
                return (
                  <div
                    key={itemId}
                    className={styles.rankingCard}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", idx.toString());
                      e.currentTarget.classList.add(styles.dragging);
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove(styles.dragging);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                      const toIdx = idx;
                      if (fromIdx !== toIdx) {
                        const newRanking = [...ranking];
                        const [movedItem] = newRanking.splice(fromIdx, 1);
                        newRanking.splice(toIdx, 0, movedItem);
                        setRanking(newRanking);
                      }
                    }}
                  >
                    <div className={styles.rankBadge}>
                      {rankNum}
                      <span className={styles.rankSuffix}>
                        {rankNum === 1 ? "st" : rankNum === 2 ? "nd" : rankNum === 3 ? "rd" : "th"}
                      </span>
                    </div>
                    
                    <div className={styles.rankingDragHandle}>
                      <span className={styles.dragIcon}>⋮⋮</span>
                    </div>

                    <div className={styles.rankingContent}>
                      <div className={styles.rankingTitleRow}>
                        <span className={styles.rankingIcon}>{item.icon}</span>
                        <h4 className={styles.rankingItemTitle}>{item.label}</h4>
                      </div>
                      <p className={styles.rankingItemDesc}>{item.desc}</p>
                    </div>

                    <div className={styles.rankingActions}>
                      <button
                        type="button"
                        className={styles.rankArrowBtn}
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, "up")}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className={styles.rankArrowBtn}
                        disabled={idx === ranking.length - 1}
                        onClick={() => moveItem(idx, "down")}
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 4: // Budget
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Tuition & Hostel Budget</h2>
            <p className={styles.questionSubtitle}>Set your maximum budget constraint (covers 4 years tuition + hostel)</p>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>Max 4-Year Budget Limit</span>
                <span style={{ color: "var(--brand-green)" }}>₹{(budgetLimit / 100000).toFixed(1)} Lakhs</span>
              </div>
              <input
                type="range"
                min="500000"
                max="3000000"
                step="50000"
                className={styles.sliderInput}
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
              />
            </div>

            <label className={styles.checkboxLabel} style={{ marginTop: "2rem" }}>
              <input
                type="checkbox"
                checked={isBudgetConstraint}
                onChange={(e) => setIsBudgetConstraint(e.target.checked)}
              />
              Enforce strictly (exceeding costs will trigger heavy score penalties)
            </label>
          </div>
        );
      case 5: // Branch Preference
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Preferred B.Tech Branches</h2>
            <p className={styles.questionSubtitle}>Select the engineering specializations you are open to</p>

            <div className={styles.optionsGrid}>
              {["CSE", "IT", "ECE", "ME", "CE"].map(branch => (
                <div
                  key={branch}
                  className={`${styles.optionCard} ${preferredBranches.includes(branch) ? styles.optionCardActive : ""}`}
                  onClick={() => handleBranchToggle(branch)}
                >
                  <input type="checkbox" checked={preferredBranches.includes(branch)} readOnly />
                  <span className={styles.optionTitle}>{branch}</span>
                  <span className={styles.optionDesc}>
                    {branch === "CSE" ? "Computer Science" : 
                     branch === "IT" ? "Information Tech" : 
                     branch === "ECE" ? "Electronics & Comm" : 
                     branch === "ME" ? "Mechanical Eng" : "Civil Engineering"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render Results View
  const renderResults = () => {
    if (results.length === 0) {
      return (
        <div className={styles.resultsWrapper} style={{ textAlign: "center", padding: "4rem 0" }}>
          <h2>No recommendations matched.</h2>
          <p>Try relaxing your academic percentiles or budget limits.</p>
          <button className={styles.ctaBtn} style={{ marginTop: "2rem" }} onClick={resetQuiz}>
            Restart Predictor
          </button>
        </div>
      );
    }

    return (
      <div className={styles.resultsWrapper}>
        <div className={styles.resultsHeader}>
          <h2>Predictor Analysis: Top Matches</h2>
          <p>Data-backed fit calculations computed in real-time</p>
        </div>

        {results.map((match) => {
          const strengths = [];
          const tradeoffs = [];

          if ((match.avgSalary || 0) >= 900000) {
            strengths.push("Flagship Placements: Offers prime recruiting returns (averaging ₹9 LPA+).");
          }
          if (match.collegeLifeScore >= 9) {
            strengths.push("A+ Campus life and crowd: Excellent campus amenities & ratings.");
          }
          if (match.isPartner) {
            strengths.push("Exclusive Admissions Pipeline: Facilitates direct lookup tracking.");
          }

          const total4YrCost = (match.tuitionFeeAnnual + match.hostelFeeAnnual) * 4;
          if (total4YrCost > budgetLimit) {
            tradeoffs.push("Exceeds Ideal Budget: Tuition + Hostel over 4 years exceeds your specified budget constraint.");
          }
          if (match.admissionCompetitiveness.category === "Reach") {
            tradeoffs.push("High Admissions Cutoff: Competitiveness category is Reach; target score lies close to historic cutoffs.");
          }
          if (selectedStates.length > 0 && !selectedStates.includes(match.state)) {
            tradeoffs.push("Location mismatch: The campus resides outside of your preferred geographic regions.");
          }

          if (strengths.length === 0) strengths.push("Consistent academic standards with high NIRF rankings.");
          if (tradeoffs.length === 0) tradeoffs.push("High student-to-faculty classroom ratio across main branches.");

          return (
            <div key={match.id + "-" + match.branchCode} className={styles.resultCard}>
              <div className={styles.resultCardTop}>
                <div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#0c2e1b" }}>
                    {match.name}
                  </h3>
                  <p style={{ color: "#556052", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                    📍 {match.city}, {match.state} | Branch: <strong>{match.branchCode}</strong>
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                  <div className={styles.scoreCircle}>
                    {match.matchScore.toFixed(0)}%
                  </div>
                  <span className={`${styles.competitivenessBadge} ${
                    match.admissionCompetitiveness.category === "Safe" ? styles.badgeSafe :
                    match.admissionCompetitiveness.category === "Target" ? styles.badgeTarget :
                    match.admissionCompetitiveness.category === "Reach" ? styles.badgeReach : styles.badgeUnlikely
                  }`}>
                    {match.admissionCompetitiveness.category}
                  </span>
                </div>
              </div>

              {/* Explainability reasons */}
              <div className={styles.explainSection}>
                <div className={styles.explainTitle}>Why it matches</div>
                <ul className={styles.bulletList}>
                  {match.keyReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              {/* Strengths & Tradeoffs Grid */}
              <div className={styles.strengthsGrid}>
                <div className={styles.strengthBlock}>
                  <div className={`${styles.blockTitle} ${styles.blockTitleGreen}`}>
                    <span>💚</span> Key Strengths
                  </div>
                  <ul className={styles.bulletList} style={{ margin: 0 }}>
                    {strengths.map((str, idx) => (
                      <li key={idx} style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className={styles.tradeoffBlock}>
                  <div className={`${styles.blockTitle} ${styles.blockTitleRed}`}>
                    <span>⚠️</span> Tradeoffs
                  </div>
                  <ul className={styles.bulletList} style={{ margin: 0 }}>
                    {tradeoffs.map((td, idx) => (
                      <li key={idx} style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>{td}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem", gap: "1rem" }}>
                <Link href={`/compare?add=${match.id}`} className={styles.ctaBtn} style={{ backgroundColor: "#f4f3ed", color: "#0c2e1b", border: "1px solid #e5e3dc" }}>
                  Add to Compare
                </Link>
                <a href={match.officialApplyUrl} target="_blank" rel="noreferrer" className={styles.ctaBtn}>
                  Apply Online
                </a>
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <button className={styles.ctaBtn} onClick={resetQuiz}>
            Rerun Quiz
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <Navbar />

      {/* Main quiz interface or results panel */}
      {step === 6 ? (
        renderResults()
      ) : (
        <div className={styles.quizLayout}>
          {/* Left illustration side */}
          <div className={styles.illustrationSide}>
            <div style={{ fontSize: "6rem" }}>🎓</div>
            <h3 className={styles.illusTitle}>College Predictor Quiz</h3>
            <p className={styles.illusDesc}>
              Answer a few simple questions to test and predict your competitive admissions probability
            </p>
          </div>

          {/* Right form/question side */}
          <div className={styles.quizSide}>
            {/* Top progress indicator */}
            {renderStepIndicator()}

            {/* Render form step */}
            <div key={step} className={styles.stepTransition}>
              {renderQuizStep()}
            </div>

            {/* Bottom Actions */}
            <div className={styles.buttonGroup}>
              {step > 1 ? (
                <button className={styles.prevBtn} onClick={handleBack} disabled={loading}>
                  ← Back
                </button>
              ) : (
                <div />
              )}
              <button className={styles.nextBtn} onClick={handleNext} disabled={loading}>
                {loading ? "Calculating..." : step === 5 ? "Generate Results" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid #e5e3dc", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "#8b9588", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "#8b9588", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
