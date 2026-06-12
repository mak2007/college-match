"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import styles from "./match.module.css";
import { BRANCH_OPTIONS } from "@/lib/branches";

interface LocationPreference {
  state: string;
  city: string;
}

interface PriorityItem {
  id: string;
  label: string;
}

interface MatchResult {
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
    category: "Dream" | "Target" | "Safe";
    badgeText: string;
  };
  keyReasons: string[];
}

export default function LiveMatcher() {
  // Input states
  const [jeePercentile, setJeePercentile] = useState<number>(92);
  const [class12Percentage, setClass12Percentage] = useState<number>(85);
  const [budgetLimit, setBudgetLimit] = useState<number>(1800000); // 18 Lakhs default
  const [isBudgetConstraint, setIsBudgetConstraint] = useState<boolean>(true);
  const [restrictLocation, setRestrictLocation] = useState<boolean>(false);
  const [selectedLocations, setSelectedLocations] = useState<LocationPreference[]>([]);
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);
  
  // Priorities list (placements, roi, branch_strength, college_life, curriculum)
  const [priorities, setPriorities] = useState<PriorityItem[]>([
    { id: "placements", label: "💼 Placements & Salaries" },
    { id: "roi", label: "Value for Money (ROI)" },
    { id: "branch_strength", label: "🎓 Branch Department Strength" },
    { id: "college_life", label: "🌴 Campus Life & Hostels" },
    { id: "curriculum", label: "📖 Modern Course Standards" },
  ]);

  // UI States
  const [stateInput, setStateInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [careerGoal, setCareerGoal] = useState<string>("NOT_SURE");

  const AVAILABLE_LOCATIONS = [
    { state: "Karnataka", city: "Bengaluru" },
    { state: "Karnataka", city: "Manipal" },
    { state: "Tamil Nadu", city: "Vellore" },
    { state: "Tamil Nadu", city: "Chennai" },
    { state: "Maharashtra", city: "Pune" },
    { state: "Punjab", city: "Patiala" },
    { state: "Rajasthan", city: "Jaipur" },
    { state: "Uttar Pradesh", city: "Noida" },
    { state: "Uttar Pradesh", city: "Greater Noida" },
    { state: "Odisha", city: "Bhubaneswar" },
  ];

  // Helper: Shift priorities
  const handleMovePriority = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === priorities.length - 1) return;

    const newPriorities = [...priorities];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = newPriorities[index];
    newPriorities[index] = newPriorities[targetIdx];
    newPriorities[targetIdx] = temp;
    setPriorities(newPriorities);
  };

  // Helper: Toggle branch selection
  const handleBranchToggle = (code: string) => {
    if (preferredBranches.includes(code)) {
      if (preferredBranches.length > 1) {
        setPreferredBranches(preferredBranches.filter(b => b !== code));
      }
    } else {
      setPreferredBranches([...preferredBranches, code]);
    }
  };

  // Helper: Add location
  const handleAddLocation = () => {
    if (!stateInput) return;
    const duplicate = selectedLocations.some(
      loc => loc.state.toLowerCase() === stateInput.toLowerCase() && 
             loc.city.toLowerCase() === cityInput.toLowerCase()
    );
    if (!duplicate) {
      setSelectedLocations([...selectedLocations, { state: stateInput, city: cityInput }]);
    }
    setStateInput("");
    setCityInput("");
  };

  // Helper: Remove location
  const handleRemoveLocation = (index: number) => {
    setSelectedLocations(selectedLocations.filter((_, idx) => idx !== index));
  };

  // Core fetch matching algorithm
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        jeePercentile: jeePercentile,
        class12Percentage: class12Percentage,
        budgetLimit: isBudgetConstraint ? budgetLimit : null,
        isBudgetConstraint,
        restrictLocation,
        locations: selectedLocations,
        preferredBranches,
        priorities: priorities.map((p, idx) => ({
          criteria: p.id,
          rankOrder: idx + 1,
        })),
        careerGoal,
      };

      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to query matches");
      }
      setMatches(data.matches || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while matching colleges.");
    } finally {
      setLoading(false);
    }
  }, [
    jeePercentile,
    class12Percentage,
    budgetLimit,
    isBudgetConstraint,
    restrictLocation,
    selectedLocations,
    preferredBranches,
    priorities,
    careerGoal,
  ]);

  // Fetch matches initially and trigger live reload when dependencies update
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMatches();
    }, 400); // 400ms debounce to prevent spamming server on fast slider movement

    return () => clearTimeout(delayDebounce);
  }, [fetchMatches]);

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <Link href="/" className={styles.logo}>
            CollegeMatch
          </Link>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            <Link href="/wizard" className={styles.navLink}>
              Classic Wizard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Grid View: Left Inputs Panel & Right Matches Panel */}
      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div className={styles.titleSection}>
          <h1>Live College Matcher & Optimizer</h1>
          <p>
            Adjust sliders, select branches, and reorder priorities to see matches adapt in real-time.
          </p>
        </div>

        <div className={styles.layoutGrid}>
          {/* LEFT: Live Controls Panel */}
          <aside className={styles.sidebar}>
            <h3 className={styles.panelTitle}>⚙️ Match Filters</h3>

            {/* Academics Section */}
            <div className={styles.filterSection}>
              <h4 className={styles.sectionLabel}>Academics</h4>
              
              <div className={styles.inputControl}>
                <div className={styles.sliderLabelRow}>
                  <span>JEE Main Percentile:</span>
                  <strong>{jeePercentile}%</strong>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={100} 
                  step={0.5}
                  value={jeePercentile}
                  onChange={(e) => setJeePercentile(parseFloat(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>

              <div className={styles.inputControl} style={{ marginTop: "1rem" }}>
                <div className={styles.sliderLabelRow}>
                  <span>Class 12 Boards:</span>
                  <strong>{class12Percentage}%</strong>
                </div>
                <input 
                  type="range" 
                  min={50} 
                  max={100} 
                  step={0.5}
                  value={class12Percentage}
                  onChange={(e) => setClass12Percentage(parseFloat(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>
            </div>

            {/* Career Goal Section */}
            <div className={styles.filterSection}>
              <h4 className={styles.sectionLabel}>Career Goal</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { id: "PLACEMENT", label: "💼 Get Placed" },
                  { id: "STARTUP", label: "🚀 Start a Startup" },
                  { id: "HIGHER_STUDIES_INDIA", label: "🎓 Higher Studies (India)" },
                  { id: "HIGHER_STUDIES_ABROAD", label: "🌍 Study Abroad" },
                  { id: "GOVERNMENT_EXAMS", label: "📝 Government Exams" },
                  { id: "NOT_SURE", label: "🤔 Not Sure Yet" },
                ].map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={`${styles.branchBtn} ${careerGoal === goal.id ? styles.branchBtnActive : ""}`}
                    onClick={() => setCareerGoal(goal.id)}
                    style={{ textAlign: "left", justifyContent: "flex-start" }}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Financial Budget Section */}
            <div className={styles.filterSection}>
              <div className={styles.sliderLabelRow}>
                <h4 className={styles.sectionLabel} style={{ margin: 0 }}>4-Year Budget</h4>
                <div className={styles.toggleConstraint}>
                  <input 
                    type="checkbox" 
                    id="noBudgetConstraint"
                    checked={!isBudgetConstraint}
                    onChange={(e) => setIsBudgetConstraint(!e.target.checked)}
                  />
                  <label htmlFor="noBudgetConstraint">Unlimited</label>
                </div>
              </div>

              {isBudgetConstraint && (
                <div className="animate-fade" style={{ marginTop: "0.75rem" }}>
                  <div className={styles.sliderLabelRow}>
                    <span>Max Fee Limit:</span>
                    <strong>₹{(budgetLimit / 100000).toFixed(1)} Lakh</strong>
                  </div>
                  <input 
                    type="range" 
                    min={400000} 
                    max={3000000} 
                    step={50000}
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(parseInt(e.target.value))}
                    className={styles.rangeSlider}
                  />
                </div>
              )}
            </div>

            {/* B.Tech Branch Preferences */}
            <div className={styles.filterSection}>
              <h4 className={styles.sectionLabel}>Preferred Branches</h4>
              <div className={styles.branchCheckboxGrid}>
                {BRANCH_OPTIONS.map((branch) => {
                  const isChecked = preferredBranches.includes(branch.code);
                  return (
                    <button 
                      key={branch.code}
                      type="button"
                      className={`${styles.branchBtn} ${isChecked ? styles.branchBtnActive : ""}`}
                      onClick={() => handleBranchToggle(branch.code)}
                    >
                      {branch.code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Preferences */}
            <div className={styles.filterSection}>
              <h4 className={styles.sectionLabel}>Location Preferences</h4>
              <div style={{ display: "flex", gap: "0.25rem", margin: "0.5rem 0" }}>
                <select 
                  value={stateInput}
                  onChange={(e) => {
                    setStateInput(e.target.value);
                    setCityInput("");
                  }}
                  className={styles.selectField}
                >
                  <option value="">-- State --</option>
                  {Array.from(new Set(AVAILABLE_LOCATIONS.map(l => l.state))).map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <select 
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className={styles.selectField}
                  disabled={!stateInput}
                >
                  <option value="">-- City --</option>
                  {AVAILABLE_LOCATIONS
                    .filter(l => l.state === stateInput)
                    .map(l => (
                      <option key={l.city} value={l.city}>{l.city}</option>
                    ))}
                </select>

                <button 
                  type="button" 
                  onClick={handleAddLocation}
                  disabled={!stateInput}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 0.75rem", borderRadius: "6px" }}
                >
                  +
                </button>
              </div>

              {selectedLocations.length > 0 && (
                <div className={styles.locationsRow}>
                  {selectedLocations.map((loc, idx) => (
                    <span key={idx} className={styles.locationTag}>
                      {loc.city || loc.state}
                      <button type="button" onClick={() => handleRemoveLocation(idx)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.locationToggle} style={{ marginTop: "0.75rem" }}>
                <input 
                  type="checkbox" 
                  id="strictLocCheck" 
                  checked={restrictLocation}
                  onChange={(e) => setRestrictLocation(e.target.checked)}
                />
                <label htmlFor="strictLocCheck">Restrict results strictly to these states/cities</label>
              </div>
            </div>

            {/* Priority Centroid Ranking */}
            <div className={styles.filterSection} style={{ borderBottom: "none", paddingBottom: 0 }}>
              <h4 className={styles.sectionLabel}>Rank Priorities (Centroid Weights)</h4>
              <p className={styles.infoText}>Sort in order of preference (1 = Highest):</p>
              
              <div className={styles.priorityList}>
                {priorities.map((item, index) => (
                  <div key={item.id} className={styles.priorityItem}>
                    <span className={styles.priorityRank}>{index + 1}</span>
                    <span className={styles.priorityLabel}>{item.label}</span>
                    <div className={styles.priorityArrows}>
                      <button 
                        type="button" 
                        disabled={index === 0} 
                        onClick={() => handleMovePriority(index, "up")}
                      >
                        ▲
                      </button>
                      <button 
                        type="button" 
                        disabled={index === priorities.length - 1} 
                        onClick={() => handleMovePriority(index, "down")}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT: Matches Results Panel */}
          <main className={styles.resultsPanel}>
            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.resultsHeading}>
              <h2>Top Matches Found ({matches.length})</h2>
              {loading && <span className={styles.loadingSpinner}>Updating matches...</span>}
            </div>

            {matches.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "4rem 2rem", textAlign: "center" }}>
                <h3>No Colleges Match Your Filters</h3>
                <p style={{ color: "var(--text-secondary)", marginTop: "1rem" }}>
                  Try relaxing your budget, adding more locations, or selecting other preferred branches.
                </p>
              </div>
            ) : (
              <div className={styles.collegesList}>
                {matches.map((item) => {
                  let competitivenessClass = styles.badgeTarget;
                  if (item.admissionCompetitiveness.category === "Safe") {
                    competitivenessClass = styles.badgeSafe;
                  } else if (item.admissionCompetitiveness.category === "Dream") {
                    competitivenessClass = styles.badgeDream;
                  }

                  const totalCost = item.feeInfo.total4YrCost;

                  return (
                    <article key={`${item.collegeId}-${item.branchCode}`} className={`${styles.collegeCard} animate-scale`}>
                      
                      {/* Card Top Row: Name and Score */}
                      <div className={styles.cardHeader}>
                        <div className={styles.titleMeta}>
                          <span className={styles.rankNum}>#{item.rankPosition}</span>
                          <div>
                            <h3 className={styles.collegeName}>{item.name}</h3>
                            <p className={styles.collegeLoc}>📍 {item.city}, {item.state}</p>
                          </div>
                        </div>

                        <div className={styles.scoreContainer}>
                          <span className={styles.scoreTitle}>Match Fit</span>
                          <span className={styles.scoreVal}>{item.matchScore}%</span>
                        </div>
                      </div>

                      {/* Branch & Course Offer */}
                      <div className={styles.courseTagRow}>
                        <span className={styles.branchCode}>{item.branchCode}</span>
                        <span className={styles.branchName}>{item.branchName}</span>
                      </div>

                      {/* Parameters Grid */}
                      <div className={styles.paramsGrid}>
                        {/* Salary Info */}
                        <div className={styles.paramSection}>
                          <h5>Placements (LPA)</h5>
                          <div className={styles.paramRow}>
                            <span>Average:</span>
                            <strong>₹{(Number(item.placementInfo.avgSalary) / 100000).toFixed(1)}L</strong>
                          </div>
                          <div className={styles.paramRow}>
                            <span>Median:</span>
                            <strong>₹{(Number(item.placementInfo.medianSalary) / 100000).toFixed(1)}L</strong>
                          </div>
                          {item.placementInfo.highestSalary && (
                            <div className={styles.paramRow}>
                              <span>Highest:</span>
                              <strong>₹{(Number(item.placementInfo.highestSalary) / 100000).toFixed(1)}L</strong>
                            </div>
                          )}
                        </div>

                        {/* Financials Info */}
                        <div className={styles.paramSection}>
                          <h5>4-Yr Cost Est.</h5>
                          <div className={styles.paramRow}>
                            <span>Annual Tuition:</span>
                            <strong>₹{(Number(item.feeInfo.annualTuition) / 100000).toFixed(1)}L</strong>
                          </div>
                          <div className={styles.paramRow}>
                            <span>Annual Hostel:</span>
                            <strong>₹{(Number(item.feeInfo.annualHostel) / 100000).toFixed(1)}L</strong>
                          </div>
                          <div className={styles.totalCostRow}>
                            <span>4-Year Total:</span>
                            <strong>₹{(totalCost / 100000).toFixed(1)} Lakh</strong>
                          </div>
                        </div>

                        {/* Admissions Likelihood */}
                        <div className={styles.paramSection} style={{ borderRight: "none" }}>
                          <h5>Admissions Fit</h5>
                          <span className={`${styles.competitivenessBadge} ${competitivenessClass}`}>
                            {item.admissionCompetitiveness.category}
                          </span>
                          <p className={styles.eligibilityText}>
                            Based on your percentile inputs and college historical cutoffs.
                          </p>
                        </div>
                      </div>

                      {/* Card Footer: Explainability Tags & Actions */}
                      <div className={styles.cardFooter}>
                        <div className={styles.reasonsList}>
                          {item.keyReasons.map((reason, idx) => (
                            <div key={idx} className={styles.reasonTag}>
                              ✨ {reason}
                            </div>
                          ))}
                        </div>
                        
                        <div className={styles.actionBlock}>
                          <a 
                            href={item.officialApplyUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-primary"
                            style={{ padding: "0.6rem 1.25rem", fontSize: "0.875rem" }}
                          >
                            Apply Official Portal ↗
                          </a>
                        </div>
                      </div>

                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
