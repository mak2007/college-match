"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./predict.module.css";
import Navbar from "@/components/Navbar";
import { BRANCH_OPTIONS } from "@/lib/branches";

const PENDING_QUIZ_KEY = "cm_pending_quiz";
const PROGRESS_KEY = "cm_predictor_progress";

export default function Predictor() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Quiz Form states
  const [jeePercentile, setJeePercentile] = useState(90);
  const [class12Percentage, setClass12Percentage] = useState(85);
  const [budgetLimit, setBudgetLimit] = useState(1600000);
  const [isBudgetConstraint, setIsBudgetConstraint] = useState(true);
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [locationMode, setLocationMode] = useState<"all" | "states">("all");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [ranking, setRanking] = useState<string[]>([
    "placements",
    "curriculum",
    "campus_life",
    "research",
    "extracurriculars"
  ]);
  const [careerGoal, setCareerGoal] = useState<string>("NOT_SURE");

  // On mount: restore saved quiz progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.jeePercentile !== undefined) setJeePercentile(parsed.jeePercentile);
        if (parsed.class12Percentage !== undefined) setClass12Percentage(parsed.class12Percentage);
        if (parsed.budgetLimit !== undefined) setBudgetLimit(parsed.budgetLimit);
        if (parsed.isBudgetConstraint !== undefined) setIsBudgetConstraint(parsed.isBudgetConstraint);
        if (parsed.preferredBranches !== undefined) setPreferredBranches(parsed.preferredBranches);
        if (parsed.selectedRegions !== undefined) setSelectedRegions(parsed.selectedRegions);
        if (parsed.locationMode !== undefined) setLocationMode(parsed.locationMode);
        if (parsed.selectedStates !== undefined) setSelectedStates(parsed.selectedStates);
        if (parsed.ranking !== undefined) setRanking(parsed.ranking);
        if (parsed.careerGoal !== undefined) setCareerGoal(parsed.careerGoal);
      }
    } catch (e) {
      console.error("Error loading progress from localStorage", e);
    }
  }, []);

  // Save quiz progress during steps 1-5
  useEffect(() => {
    if (step < 6 && !quizCompleted) {
      const progress = {
        step,
        jeePercentile,
        class12Percentage,
        budgetLimit,
        isBudgetConstraint,
        preferredBranches,
        selectedRegions,
        locationMode,
        selectedStates,
        ranking,
        careerGoal,
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }
  }, [
    step, jeePercentile, class12Percentage, budgetLimit, isBudgetConstraint,
    preferredBranches, selectedRegions, locationMode, selectedStates, ranking, careerGoal, quizCompleted,
  ]);

  const handleNext = () => {
    if (step < 6) {
      setStep(prev => prev + 1);
    } else {
      handleQuizComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleQuizComplete = async () => {
    setLoading(true);

    const quizData = {
      jeePercentile,
      class12Percentage,
      budgetLimit,
      isBudgetConstraint,
      restrictLocation: locationMode === "states" && selectedStates.length > 0,
      selectedLocations: locationMode === "states"
        ? selectedStates.map(state => ({ state, city: "" }))
        : [],
      preferredBranches,
      careerGoal,
      priorities: ranking.map((item, index) => ({
        criteria: item.toUpperCase(),
        rankOrder: index + 1
      })),
    };

    try {
      const res = await fetch("/api/recommendations/from-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizData }),
      });
      const data = await res.json();
      if (res.ok && data.student_id) {
        localStorage.removeItem(PROGRESS_KEY);
        window.location.href = `/results?student_id=${data.student_id}`;
        return;
      } else {
        alert(data.error || "Failed to calculate recommendations. Please try again.");
      }
    } catch (e) {
      console.error("Error submitting quiz:", e);
      alert("Network error while generating results. Please check your connection.");
    }
    setLoading(false);
  };

  const resetQuiz = () => {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(PENDING_QUIZ_KEY);
    setStep(1);
    setQuizCompleted(false);
  };

  const handleBranchToggle = (branch: string) => {
    setPreferredBranches(prev =>
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
  };

  const STEP_LABELS = ["Academics", "Career Goal", "Location", "Priorities", "Budget", "Branches"];

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

  const renderQuizStep = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>
              Your <span className={styles.titleHighlight}>Academic Profile</span>
            </h2>
            <p className={styles.questionSubtitle}>Provide scores to calculate your target admissibility cutoff fit</p>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>JEE Percentile</span>
                <span style={{ color: "var(--brand-blue)" }}>{jeePercentile}%</span>
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
                <span style={{ color: "var(--brand-blue)" }}>{class12Percentage}%</span>
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
      case 2:
        const CAREER_GOALS = [
          {
            id: "PLACEMENT",
            icon: "💼",
            bgColor: "#eef2ff",
            title: "Get Placed",
            desc: "Secure a high-paying job right after graduation",
          },
          {
            id: "STARTUP",
            icon: "🚀",
            bgColor: "#fee2e2",
            title: "Start a Startup",
            desc: "Build entrepreneurial skills and access incubation",
          },
          {
            id: "HIGHER_STUDIES",
            icon: "🎓",
            bgColor: "#ecfdf5",
            title: "Higher Studies",
            desc: "Pursue M.Tech, MS or research opportunities",
          },
          {
            id: "NOT_SURE",
            icon: "🌐",
            bgColor: "#e0f2fe",
            title: "Explore & Discover",
            desc: "Explore opportunities across diverse domains",
          },
        ];

        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>
              What is your <span className={styles.titleHighlight}>career goal</span> after B.Tech?
            </h2>
            <p className={styles.questionSubtitle}>
              This is the primary factor driving your college recommendations
            </p>

            <div className={styles.careerGoalList}>
              {CAREER_GOALS.map((goal) => {
                const isSelected = careerGoal === goal.id;
                return (
                  <div
                    key={goal.id}
                    className={`${styles.careerCard} ${isSelected ? styles.careerCardActive : ""}`}
                    onClick={() => setCareerGoal(goal.id)}
                  >
                    <div className={styles.careerIconBox} style={{ backgroundColor: goal.bgColor }}>
                      <span>{goal.icon}</span>
                    </div>
                    <div className={styles.careerContent}>
                      <h3 className={styles.careerTitle}>{goal.title}</h3>
                      <p className={styles.careerDesc}>{goal.desc}</p>
                    </div>
                    <div className={`${styles.careerArrowCircle} ${isSelected ? styles.careerArrowCircleActive : ""}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 3:
        const INDIAN_STATES = [
          "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Gujarat",
          "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
          "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
          "Tamil Nadu", "Telangana", "Uttarakhand", "Uttar Pradesh", "West Bengal"
        ];

        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>
              Where do you <span className={styles.titleHighlight}>prefer to study</span>?
            </h2>
            <p className={styles.questionSubtitle}>Select specific states or choose All India</p>

            <div className={styles.locationSelectionContainer}>
              <div
                className={`${styles.locationOptionCard} ${locationMode === "states" ? styles.locationOptionCardActive : ""}`}
                onClick={() => setLocationMode("states")}
              >
                <div className={styles.locationOptionHeader}>
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === "states"}
                    onChange={() => setLocationMode("states")}
                  />
                  <span className={styles.locationOptionTitle}>Select Specific States</span>
                </div>

                {locationMode === "states" && (
                  <div className={styles.dropdownSection} onClick={(e) => e.stopPropagation()}>
                    <select
                      className={styles.stateSelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedStates.includes(val)) {
                          setSelectedStates(prev => [...prev, val]);
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">-- Choose a State --</option>
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st} disabled={selectedStates.includes(st)}>
                          {st}
                        </option>
                      ))}
                    </select>

                    {selectedStates.length > 0 ? (
                      <div className={styles.stateTagsContainer}>
                        {selectedStates.map(st => (
                          <span key={st} className={styles.stateTag}>
                            {st}
                            <button
                              type="button"
                              className={styles.removeTagBtn}
                              onClick={() => setSelectedStates(prev => prev.filter(s => s !== st))}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.dropdownHint}>Select one or more states from the dropdown menu.</p>
                    )}
                  </div>
                )}
              </div>

              <div
                className={`${styles.locationOptionCard} ${locationMode === "all" ? styles.locationOptionCardActive : ""}`}
                onClick={() => {
                  setLocationMode("all");
                  setSelectedStates([]);
                }}
              >
                <div className={styles.locationOptionHeader}>
                  <input
                    type="radio"
                    name="locationMode"
                    checked={locationMode === "all"}
                    onChange={() => {
                      setLocationMode("all");
                      setSelectedStates([]);
                    }}
                  />
                  <span className={styles.locationOptionTitle}>All India</span>
                </div>
                <p className={styles.locationOptionDesc}>
                  No location restrictions. Recommend colleges from all regions across India.
                </p>
              </div>
            </div>
          </div>
        );
      case 4:
        const itemsMap = {
          placements: { label: "Placements & Salaries", icon: "💼", bgColor: "#eef2ff", desc: "Top recruiters, package statistics, and career growth" },
          curriculum: { label: "Modern Course Standards", icon: "📖", bgColor: "#f3e8ff", desc: "Updated syllabus, industry readiness, and faculty standards" },
          campus_life: { label: "Campus Life & crowd", icon: "🌴", bgColor: "#ecfdf5", desc: "Modern hostels, food courts, diverse student body, and events" },
          research: { label: "Startup ecosystem", icon: "🚀", bgColor: "#fee2e2", desc: "Incubation center, funding support, startup culture, and entrepreneurial resources" },
          extracurriculars: { label: "Extracurricular activities and sports", icon: "⚽", bgColor: "#e0f2fe", desc: "Clubs, student chapters, athletic events, and active groups" }
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
            <h2 className={styles.questionTitle}>
              Rank Your <span className={styles.titleHighlight}>Priorities</span>
            </h2>
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
                      <span className={styles.rankNumber}>{rankNum}</span>
                      <span className={styles.rankSuffix}>
                        {rankNum === 1 ? "ST" : rankNum === 2 ? "ND" : rankNum === 3 ? "RD" : "TH"}
                      </span>
                    </div>

                    <div className={styles.rankingDragHandle} title="Drag to reorder">
                      <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                        <circle cx="3" cy="3" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" />
                        <circle cx="3" cy="9" r="1.5" />
                        <circle cx="9" cy="9" r="1.5" />
                        <circle cx="3" cy="15" r="1.5" />
                        <circle cx="9" cy="15" r="1.5" />
                      </svg>
                    </div>

                    <div className={styles.priorityIconBox} style={{ backgroundColor: item.bgColor }}>
                      <span>{item.icon}</span>
                    </div>

                    <div className={styles.rankingContent}>
                      <h4 className={styles.rankingItemTitle}>{item.label}</h4>
                      <p className={styles.rankingItemDesc}>{item.desc}</p>
                    </div>

                    {/* Minimalist Unified Capsule Reorder Control */}
                    <div className={styles.minimalReorderControl}>
                      <button
                        type="button"
                        className={styles.minimalChevronBtn}
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, "up")}
                        title="Move Up"
                        aria-label="Move Up"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>
                      <div className={styles.reorderDivider} />
                      <button
                        type="button"
                        className={styles.minimalChevronBtn}
                        disabled={idx === ranking.length - 1}
                        onClick={() => moveItem(idx, "down")}
                        title="Move Down"
                        aria-label="Move Down"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 5:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>
              Tuition & <span className={styles.titleHighlight}>Hostel Budget</span>
            </h2>
            <p className={styles.questionSubtitle}>Set your maximum budget constraint or allow any budget</p>

            <div style={{ marginBottom: "1.5rem", background: "white", padding: "1.25rem", borderRadius: "12px", border: "1.5px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "1.05rem", fontWeight: 700, color: "#4f46e5" }}>
                <input
                  type="checkbox"
                  checked={!isBudgetConstraint}
                  onChange={(e) => setIsBudgetConstraint(!e.target.checked)}
                  style={{ width: "1.3rem", height: "1.3rem", cursor: "pointer" }}
                />
                <span>🔓 No Budget Limit / Any Budget (Include colleges across all fee tiers)</span>
              </label>
            </div>

            {isBudgetConstraint ? (
              <div className={styles.sliderContainer}>
                <div className={styles.sliderLabel}>
                  <span>Max 4-Year Budget Limit</span>
                  <span style={{ color: "var(--brand-blue)" }}>₹{(budgetLimit / 100000).toFixed(1)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="3500000"
                  step="50000"
                  className={styles.sliderInput}
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(Number(e.target.value))}
                />
              </div>
            ) : (
              <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", color: "#166534", fontSize: "0.95rem", fontWeight: 600 }}>
                ✓ Budget filter disabled. High-value private universities, top AI tech institutes, and government colleges will all be recommended.
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>
              Preferred <span className={styles.titleHighlight}>B.Tech Branches</span>
            </h2>
            <p className={styles.questionSubtitle}>Select the engineering specializations you are open to</p>

            <div className={styles.optionsGrid}>
              {BRANCH_OPTIONS.map(branch => (
                <div
                  key={branch.code}
                  className={`${styles.optionCard} ${preferredBranches.includes(branch.code) ? styles.optionCardActive : ""}`}
                  onClick={() => handleBranchToggle(branch.code)}
                >
                  <input type="checkbox" checked={preferredBranches.includes(branch.code)} readOnly />
                  <span className={styles.optionTitle}>{branch.code}</span>
                  <span className={styles.optionDesc}>{branch.shortLabel}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.wrapper}>
      <Navbar />

      <div className={styles.quizLayout}>
        <div className={styles.illustrationSide}>
          <div style={{ fontSize: "6rem" }}>🎓</div>
          <h3 className={styles.illusTitle}>College Predictor Quiz</h3>
          <p className={styles.illusDesc}>
            Answer a few simple questions to test and predict your competitive admissions probability
          </p>
        </div>

        <div className={styles.quizSide}>
          {renderStepIndicator()}

          <div key={step} className={styles.stepTransition}>
            {renderQuizStep()}
          </div>

          <div className={styles.buttonGroup}>
            {step > 1 ? (
              <button className={styles.prevBtn} onClick={handleBack} disabled={loading}>
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button className={styles.nextBtn} onClick={handleNext} disabled={loading}>
              {loading ? "Generating Results..." : step === 6 ? "Generate Results →" : "Next →"}
            </button>
          </div>
        </div>
      </div>

      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "#8b9588", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "#8b9588", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
