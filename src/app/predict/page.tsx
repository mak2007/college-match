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
            <h2 className={styles.questionTitle}>Your Academic Profile</h2>
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
          { id: "PLACEMENT", icon: "💼", title: "Get Placed", desc: "Secure a high-paying job right after graduation" },
          { id: "STARTUP", icon: "🚀", title: "Start a Startup", desc: "Build entrepreneurial skills and access incubation" },
          { id: "HIGHER_STUDIES", icon: "🎓", title: "Higher Studies", desc: "Prepare for MS/M.Tech/PhD and research opportunities" },
          { id: "NOT_SURE", icon: "🤔", title: "Not Sure Yet", desc: "Keep all options open with balanced recommendations" },
        ];

        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>What is your career goal after B.Tech?</h2>
            <p className={styles.questionSubtitle}>This is the primary factor driving your college recommendations</p>

            <div className={styles.optionsGrid}>
              {CAREER_GOALS.map((goal) => (
                <div
                  key={goal.id}
                  className={`${styles.optionCard} ${careerGoal === goal.id ? styles.optionCardActive : ""}`}
                  onClick={() => setCareerGoal(goal.id)}
                >
                  <span style={{ fontSize: "2rem" }}>{goal.icon}</span>
                  <span className={styles.optionTitle}>{goal.title}</span>
                  <span className={styles.optionDesc}>{goal.desc}</span>
                </div>
              ))}
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
            <h2 className={styles.questionTitle}>Where do you prefer to study?</h2>
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
          placements: { label: "Placements & Salaries", icon: "💼", desc: "Top recruiters, package statistics, and career growth" },
          extracurriculars: { label: "Extracurricular activities and sports", icon: "⚽", desc: "Clubs, student chapters, athletic events, and active groups" },
          campus_life: { label: "Campus Life & crowd", icon: "🌴", desc: "Modern hostels, food courts, diverse student body, and events" },
          research: { label: "Startup ecosystem", icon: "🚀", desc: "Incubation center, funding support, startup culture, and entrepreneurial resources" },
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
      case 5:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Tuition & Hostel Budget</h2>
            <p className={styles.questionSubtitle}>Set your maximum budget constraint (covers 4 years tuition + hostel)</p>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>Max 4-Year Budget Limit</span>
                <span style={{ color: "var(--brand-blue)" }}>₹{(budgetLimit / 100000).toFixed(1)} Lakhs</span>
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
          </div>
        );
      case 6:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Preferred B.Tech Branches</h2>
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

      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid #e5e3dc", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "#8b9588", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "#8b9588", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
