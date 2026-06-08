"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./predict.module.css";

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
  const [priorityType, setPriorityType] = useState("academics");
  const [jeePercentile, setJeePercentile] = useState(90);
  const [class12Percentage, setClass12Percentage] = useState(85);
  const [budgetLimit, setBudgetLimit] = useState(1600000); // 16 Lakh total budget
  const [isBudgetConstraint, setIsBudgetConstraint] = useState(true);
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [minSalaryLpa, setMinSalaryLpa] = useState(6);

  // States available in seed
  const AVAILABLE_STATES = ["Karnataka", "Tamil Nadu", "Maharashtra", "Punjab", "Rajasthan", "Uttar Pradesh", "Odisha"];

  const handleNext = () => {
    if (step < 6) {
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

  const handleStateToggle = (stateName: string) => {
    setSelectedStates(prev =>
      prev.includes(stateName) ? prev.filter(s => s !== stateName) : [...prev, stateName]
    );
  };

  const handleBranchToggle = (branch: string) => {
    setPreferredBranches(prev =>
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Map priorityTypes to structured ranks
      let priorities = [
        { criteria: "placements", rankOrder: 1 },
        { criteria: "roi", rankOrder: 2 },
        { criteria: "branch_strength", rankOrder: 3 },
        { criteria: "college_life", rankOrder: 4 },
        { criteria: "curriculum", rankOrder: 5 }
      ];

      if (priorityType === "value") {
        priorities = [
          { criteria: "roi", rankOrder: 1 },
          { criteria: "placements", rankOrder: 2 },
          { criteria: "branch_strength", rankOrder: 3 },
          { criteria: "curriculum", rankOrder: 4 },
          { criteria: "college_life", rankOrder: 5 }
        ];
      } else if (priorityType === "campus") {
        priorities = [
          { criteria: "college_life", rankOrder: 1 },
          { criteria: "placements", rankOrder: 2 },
          { criteria: "roi", rankOrder: 3 },
          { criteria: "branch_strength", rankOrder: 4 },
          { criteria: "curriculum", rankOrder: 5 }
        ];
      }

      // Call matching API endpoint
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jeePercentile,
          class12Percentage,
          budgetLimit,
          isBudgetConstraint,
          restrictLocation: selectedStates.length > 0,
          preferredLocations: selectedStates.map(state => ({ state, city: "" })),
          preferredBranches,
          priorities
        })
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.matches || []);
        setStep(7); // Show results view
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

  // Render Quiz Step
  const renderQuizStep = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Which describes you best?</h2>
            <p className={styles.questionSubtitle}>Select a focus priority that best aligns with your college goals</p>
            <div className={styles.optionsGrid}>
              <div
                className={`${styles.optionCard} ${priorityType === "academics" ? styles.optionCardActive : ""}`}
                onClick={() => setPriorityType("academics")}
              >
                <input type="radio" checked={priorityType === "academics"} readOnly />
                <span className={styles.optionIcon}>💼</span>
                <span className={styles.optionTitle}>Academic Focused</span>
                <span className={styles.optionDesc}>Prioritize top recruiters, branch department rankings, and salaries.</span>
              </div>

              <div
                className={`${styles.optionCard} ${priorityType === "value" ? styles.optionCardActive : ""}`}
                onClick={() => setPriorityType("value")}
              >
                <input type="radio" checked={priorityType === "value"} readOnly />
                <span className={styles.optionIcon}>📊</span>
                <span className={styles.optionTitle}>ROI & Value Seeker</span>
                <span className={styles.optionDesc}>Focus on placement outcomes relative to total tuition investment.</span>
              </div>

              <div
                className={`${styles.optionCard} ${priorityType === "campus" ? styles.optionCardActive : ""}`}
                onClick={() => setPriorityType("campus")}
              >
                <input type="radio" checked={priorityType === "campus"} readOnly />
                <span className={styles.optionIcon}>🎪</span>
                <span className={styles.optionTitle}>Campus Life & Crowd</span>
                <span className={styles.optionDesc}>Prioritize vibrant campus spaces, student events, and high-quality crowd.</span>
              </div>

              <div
                className={`${styles.optionCard} ${priorityType === "holistic" ? styles.optionCardActive : ""}`}
                onClick={() => setPriorityType("holistic")}
              >
                <input type="radio" checked={priorityType === "holistic"} readOnly />
                <span className={styles.optionIcon}>🌱</span>
                <span className={styles.optionTitle}>Holistic Explorer</span>
                <span className={styles.optionDesc}>Balance campus environment, flex courses, and placement parameters equally.</span>
              </div>
            </div>
          </div>
        );
      case 2:
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
      case 3:
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
      case 4:
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
      case 5:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Preferred Locations</h2>
            <p className={styles.questionSubtitle}>Select the states you are willing to move to (leave blank for no restriction)</p>

            <div className={styles.optionsGrid}>
              {AVAILABLE_STATES.map(state => (
                <div
                  key={state}
                  className={`${styles.optionCard} ${selectedStates.includes(state) ? styles.optionCardActive : ""}`}
                  onClick={() => handleStateToggle(state)}
                >
                  <input type="checkbox" checked={selectedStates.includes(state)} readOnly />
                  <span className={styles.optionTitle}>📍 {state}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className={styles.questionGroup}>
            <h2 className={styles.questionTitle}>Placement Expectations</h2>
            <p className={styles.questionSubtitle}>Set your minimum expected average package package salary (LPA)</p>

            <div className={styles.sliderContainer}>
              <div className={styles.sliderLabel}>
                <span>Min Placement Average Package</span>
                <span style={{ color: "var(--brand-green)" }}>{minSalaryLpa} LPA+</span>
              </div>
              <input
                type="range"
                min="3"
                max="18"
                step="0.5"
                className={styles.sliderInput}
                value={minSalaryLpa}
                onChange={(e) => setMinSalaryLpa(Number(e.target.value))}
              />
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
          <button className={styles.ctaBtn} style={{ marginTop: "2rem" }} onClick={() => setStep(1)}>
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
          // Dynamic calculation of Strengths & Tradeoffs based on DB values
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

          // Fallbacks if empty
          if (strengths.length === 0) strengths.push("Consistent academic standards with high NIRF rankings.");
          if (tradeoffs.length === 0) tradeoffs.push("High student-to-faculty classroom ratio across main branches.");

          return (
            <div key={match.id + "-" + match.branchCode} className={styles.resultCard}>
              <div className={styles.resultCardTop}>
                <div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--brand-green)" }}>
                    {match.name}
                  </h3>
                  <p style={{ color: "var(--light-text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
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
                <Link href={`/compare?add=${match.id}`} className={styles.ctaBtn} style={{ backgroundColor: "#f1f5f9", color: "var(--light-text)", border: "1px solid var(--light-border)" }}>
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
          <button className={styles.ctaBtn} onClick={() => setStep(1)}>
            Rerun Quiz
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      {/* Navbar Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link href="/" className={styles.logoLink}>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              style={{ color: "#10b981", marginRight: "0.2rem" }}
            >
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="6.34" y1="6.34" x2="17.66" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="6.34" y2="17.66" />
            </svg>
            <span>kollegio</span>
          </Link>
          <nav className={styles.nav}>
            <Link href="/discover" className={styles.navLink}>
              Discover Colleges
            </Link>
            <Link href="/predict" className={`${styles.navLink} ${styles.navLinkActive}`}>
              Predictor
            </Link>
            <Link href="/rankings" className={styles.navLink}>
              Rankings
            </Link>
            <Link href="/compare" className={styles.navLink}>
              Compare
            </Link>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/predict" className={styles.ctaBtn}>
              Get My Matches
            </Link>
          </div>
        </div>
      </header>

      {/* Main quiz interface or results panel */}
      {step === 7 ? (
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
            {/* Top progress bar */}
            <div className={styles.progressContainer}>
              {step > 1 && (
                <button className={styles.backBtn} onClick={handleBack}>
                  ←
                </button>
              )}
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${(step / 6) * 100}%` }} />
              </div>
            </div>

            {/* Render form step */}
            {renderQuizStep()}

            {/* Bottom Actions */}
            <div className={styles.buttonGroup}>
              <div /> {/* Spacer */}
              <button className={styles.nextBtn} onClick={handleNext} disabled={loading}>
                {loading ? "Calculating..." : step === 6 ? "Generate Results" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid var(--light-border)", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
