"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./wizard.module.css";
import { BRANCH_OPTIONS } from "@/lib/branches";

interface LocationPreference {
  state: string;
  city: string;
}

interface PriorityItem {
  id: string;
  label: string;
}

const WIZARD_STORAGE_KEY = "cm_wizard_progress";

export default function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Location Preferences state
  const [restrictLocation, setRestrictLocation] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<LocationPreference[]>([]);
  const [stateInput, setStateInput] = useState("");
  const [cityInput, setCityInput] = useState("");

  // Step 2: Budget state
  const [budgetLimit, setBudgetLimit] = useState(1500000);
  const [isBudgetConstraint, setIsBudgetConstraint] = useState(true);

  // Step 3: Academic profile state
  const [jeePercentile, setJeePercentile] = useState<string>("");
  const [class12Percentage, setClass12Percentage] = useState<string>("");

  // Step 4: Career Goal state
  const [careerGoal, setCareerGoal] = useState<string>("NOT_SURE");

  // Step 5: Branch Preferences state
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);

  // Step 6: Priorities state
  const [priorities, setPriorities] = useState<PriorityItem[]>([
    { id: "placements", label: "Placements & Salaries" },
    { id: "curriculum", label: "Modern Course Standards" },
    { id: "campus_life", label: "Campus Life & crowd" },
    { id: "research", label: "Research and Opportunities" },
    { id: "extracurriculars", label: "Extracurricular activities and sports" },
  ]);

  const TOTAL_STEPS = 6;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.restrictLocation !== undefined) setRestrictLocation(parsed.restrictLocation);
        if (parsed.selectedLocations !== undefined) setSelectedLocations(parsed.selectedLocations);
        if (parsed.budgetLimit !== undefined) setBudgetLimit(parsed.budgetLimit);
        if (parsed.isBudgetConstraint !== undefined) setIsBudgetConstraint(parsed.isBudgetConstraint);
        if (parsed.jeePercentile !== undefined) setJeePercentile(parsed.jeePercentile);
        if (parsed.class12Percentage !== undefined) setClass12Percentage(parsed.class12Percentage);
        if (parsed.careerGoal !== undefined) setCareerGoal(parsed.careerGoal);
        if (parsed.preferredBranches !== undefined) setPreferredBranches(parsed.preferredBranches);
        if (parsed.priorities !== undefined) setPriorities(parsed.priorities);
      }
    } catch (e) {
      console.error("Error loading wizard progress from localStorage", e);
    }
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    if (step <= TOTAL_STEPS) {
      const progress = {
        step,
        restrictLocation,
        selectedLocations,
        budgetLimit,
        isBudgetConstraint,
        jeePercentile,
        class12Percentage,
        careerGoal,
        preferredBranches,
        priorities,
      };
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(progress));
    }
  }, [
    step, restrictLocation, selectedLocations, budgetLimit, isBudgetConstraint,
    jeePercentile, class12Percentage, careerGoal, preferredBranches, priorities,
  ]);

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

  const handleRemoveLocation = (index: number) => {
    setSelectedLocations(selectedLocations.filter((_, idx) => idx !== index));
  };

  const handleBranchToggle = (code: string) => {
    if (preferredBranches.includes(code)) {
      if (preferredBranches.length > 1) {
        setPreferredBranches(preferredBranches.filter(b => b !== code));
      }
    } else {
      setPreferredBranches([...preferredBranches, code]);
    }
  };

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

  const handleNext = () => {
    setError("");
    if (step === 1 && restrictLocation && selectedLocations.length === 0) {
      setError("Please add at least one location preference if choosing strict filtering.");
      return;
    }
    if (step === 3) {
      if (!jeePercentile && !class12Percentage) {
        setError("Please enter either your JEE Main Percentile or Class 12 Boards percentage.");
        return;
      }
      const jeeVal = parseFloat(jeePercentile);
      if (jeePercentile && (isNaN(jeeVal) || jeeVal < 0 || jeeVal > 100)) {
        setError("JEE Main Percentile must be between 0 and 100.");
        return;
      }
      const c12Val = parseFloat(class12Percentage);
      if (class12Percentage && (isNaN(c12Val) || c12Val < 0 || c12Val > 100)) {
        setError("Class 12 Boards percentage must be between 0 and 100.");
        return;
      }
    }

    if (step === TOTAL_STEPS) {
      // Quiz complete — save and redirect to login
      handleQuizComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleQuizComplete = () => {
    setLoading(true);
    // Save final quiz data to localStorage
    const quizData = {
      restrictLocation,
      selectedLocations,
      budgetLimit,
      isBudgetConstraint,
      jeePercentile: jeePercentile ? parseFloat(jeePercentile) : null,
      class12Percentage: class12Percentage ? parseFloat(class12Percentage) : null,
      careerGoal,
      preferredBranches,
      priorities: priorities.map((p, index) => ({
        criteria: p.id.toUpperCase(),
        rankOrder: index + 1,
      })),
    };
    localStorage.setItem("cm_pending_quiz", JSON.stringify(quizData));
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    // Redirect to login — after auth, login page will create student and run engine
    router.push("/login?mode=signup&redirect=/wizard");
  };

  return (
    <div className={styles.container}>
      <header className={styles.wizardHeader}>
        <div className={styles.logo}>CollegeMatch</div>
        <div className={styles.stepIndicator}>Step {step} of {TOTAL_STEPS}</div>
      </header>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className={styles.cardContainer}>
        <div className={`${styles.wizardCard} animate-slide`}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* STEP 1: LOCATION PREFERENCES */}
          {step === 1 && (
            <div>
              <h2 className={styles.stepTitle}>Where would you prefer to study?</h2>
              <p className={styles.stepDesc}>
                Select the states and cities in India you'd prefer to study in.
              </p>

              <div className={styles.formGroup}>
                <label>Select state & city</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <select
                    value={stateInput}
                    onChange={(e) => {
                      setStateInput(e.target.value);
                      setCityInput("");
                    }}
                    style={{ flex: 1, minWidth: "150px" }}
                  >
                    <option value="">-- Choose State --</option>
                    {Array.from(new Set(AVAILABLE_LOCATIONS.map(l => l.state))).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>

                  <select
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    style={{ flex: 1, minWidth: "150px" }}
                    disabled={!stateInput}
                  >
                    <option value="">-- Choose City (Optional) --</option>
                    {AVAILABLE_LOCATIONS
                      .filter(l => l.state === stateInput)
                      .map(l => (
                        <option key={l.city} value={l.city}>{l.city}</option>
                      ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddLocation}
                    disabled={!stateInput}
                  >
                    Add
                  </button>
                </div>

                {selectedLocations.length > 0 && (
                  <div className={styles.locationTags}>
                    {selectedLocations.map((loc, idx) => (
                      <span key={idx} className={styles.tag}>
                        {loc.city ? `${loc.city}, ${loc.state}` : loc.state}
                        <button type="button" onClick={() => handleRemoveLocation(idx)}>×</button>
                      </span>
                    ))}
                  </div>
                )}

                <div className={styles.checkboxWrapper} style={{ marginTop: "1.5rem" }}>
                  <input
                    type="checkbox"
                    id="restrictLocation"
                    checked={restrictLocation}
                    onChange={(e) => setRestrictLocation(e.target.checked)}
                  />
                  <label htmlFor="restrictLocation">
                    <strong>Strict filter:</strong> Only show colleges located in my selected regions.
                  </label>
                </div>
              </div>

              <div className={styles.actions}>
                <div />
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BUDGET PREFERENCES */}
          {step === 2 && (
            <div>
              <h2 className={styles.stepTitle}>What is your total B.Tech budget?</h2>
              <p className={styles.stepDesc}>
                Enter the maximum total budget you are willing to spend for 4 years (including tuition and hostels).
              </p>

              <div className={styles.formGroup} style={{ margin: "2rem 0" }}>
                <div className={styles.checkboxWrapper} style={{ marginBottom: "2rem" }}>
                  <input
                    type="checkbox"
                    id="noBudget"
                    checked={!isBudgetConstraint}
                    onChange={(e) => setIsBudgetConstraint(!e.target.checked)}
                  />
                  <label htmlFor="noBudget">
                    <strong>Budget is not a constraint</strong> (Show me colleges of all fee tiers)
                  </label>
                </div>

                {isBudgetConstraint && (
                  <div className="animate-fade">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <label>Maximum Budget: <strong>₹{(budgetLimit / 100000).toFixed(1)} Lakh</strong></label>
                    </div>
                    <input
                      type="range"
                      min={400000}
                      max={3000000}
                      step={50000}
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--primary-color)" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      <span>₹4 Lakh</span>
                      <span>₹15 Lakh</span>
                      <span>₹30 Lakh</span>
                    </div>

                    <div className={styles.infoBox} style={{ marginTop: "1.5rem" }}>
                      💡 <strong>Note:</strong> Budget is treated as a soft cutoff. If a college costs slightly more than your budget but provides excellent ROI, it will still be ranked with a penalty.
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ACADEMIC PROFILE */}
          {step === 3 && (
            <div>
              <h2 className={styles.stepTitle}>Tell us about your academic scores</h2>
              <p className={styles.stepDesc}>
                These scores are used strictly to calculate your admission likelihood.
              </p>

              <div className={styles.formGroup}>
                <div className="grid-2">
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.95rem" }}>
                      JEE Main Percentile
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 91.5"
                      value={jeePercentile}
                      onChange={(e) => setJeePercentile(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.95rem" }}>
                      Class 12 Board Percentage
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 85.4"
                      value={class12Percentage}
                      onChange={(e) => setClass12Percentage(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CAREER GOAL */}
          {step === 4 && (
            <div>
              <h2 className={styles.stepTitle}>What is your career goal after B.Tech?</h2>
              <p className={styles.stepDesc}>
                This is the primary factor driving your college recommendations.
              </p>

              <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: "1.5rem 0" }}>
                {[
                  { id: "PLACEMENT", icon: "💼", title: "Get Placed", desc: "Secure a high-paying job right after graduation" },
                  { id: "STARTUP", icon: "🚀", title: "Start a Startup", desc: "Build entrepreneurial skills and access incubation" },
                  { id: "HIGHER_STUDIES", icon: "🎓", title: "Higher Studies", desc: "Prepare for MS/M.Tech/PhD and research opportunities" },
                  { id: "NOT_SURE", icon: "🤔", title: "Not Sure Yet", desc: "Keep all options open with balanced recommendations" },
                ].map((goal) => (
                  <div
                    key={goal.id}
                    className={`${styles.selectionRow} ${careerGoal === goal.id ? styles.selectionRowActive : ""}`}
                    onClick={() => setCareerGoal(goal.id)}
                    style={{ cursor: "pointer", padding: "1rem", borderRadius: "8px", border: careerGoal === goal.id ? "2px solid var(--primary-color)" : "1px solid #e0ddd5" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>{goal.icon}</span>
                      <div>
                        <strong>{goal.title}</strong>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{goal.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BRANCH PREFERENCES */}
          {step === 5 && (
            <div>
              <h2 className={styles.stepTitle}>Select your preferred B.Tech branch</h2>
              <p className={styles.stepDesc}>
                Choose one or more acceptable branches of engineering.
              </p>

              <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "1rem", margin: "1.5rem 0" }}>
                {BRANCH_OPTIONS.map((branch) => {
                  const selected = preferredBranches.includes(branch.code);
                  return (
                    <div
                      key={branch.code}
                      className={`${styles.selectionRow} ${selected ? styles.selectionRowActive : ""}`}
                      onClick={() => handleBranchToggle(branch.code)}
                    >
                      <div className={styles.checkboxWrapper}>
                        <input
                          type="checkbox"
                          id={`branch_${branch.code}`}
                          checked={selected}
                          onChange={() => {}}
                        />
                        <label htmlFor={`branch_${branch.code}`}>
                          <strong>{branch.label}</strong>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PRIORITY RANKING (Final Step) */}
          {step === 6 && (
            <div>
              <h2 className={styles.stepTitle}>Rank your preferences</h2>
              <p className={styles.stepDesc}>
                Arrange the categories from <strong>MOST IMPORTANT</strong> (top) to <strong>LEAST IMPORTANT</strong> (bottom).
                Use the arrows to re-order.
              </p>

              <div className={styles.priorityList}>
                {priorities.map((item, index) => (
                  <div key={item.id} className={styles.priorityItem}>
                    <div className={styles.priorityRank}>{index + 1}</div>
                    <div className={styles.priorityLabel}>{item.label}</div>
                    <div className={styles.priorityControls}>
                      <button
                        type="button"
                        className={styles.arrowBtn}
                        onClick={() => handleMovePriority(index, "up")}
                        disabled={index === 0}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className={styles.arrowBtn}
                        onClick={() => handleMovePriority(index, "down")}
                        disabled={index === priorities.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={loading}>
                  Back
                </button>
                <button type="button" className="btn btn-primary glow-effect" onClick={handleNext} disabled={loading}>
                  {loading ? "Saving..." : "Get My Matches"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
