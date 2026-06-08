"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./wizard.module.css";

interface LocationPreference {
  state: string;
  city: string;
}

interface PriorityItem {
  id: string;
  label: string;
}

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
  const [budgetLimit, setBudgetLimit] = useState(1500000); // 15 Lakh default
  const [isBudgetConstraint, setIsBudgetConstraint] = useState(true);

  // Step 3: Academic profile state
  const [jeePercentile, setJeePercentile] = useState<string>("");
  const [class12Percentage, setClass12Percentage] = useState<string>("");

  // Step 4: Branch Preferences state
  const [preferredBranches, setPreferredBranches] = useState<string[]>(["CSE"]);

  // Step 5: Priorities state (with up/down ranking interface)
  const [priorities, setPriorities] = useState<PriorityItem[]>([
    { id: "placements", label: "Placements & Salaries" },
    { id: "roi", label: "Value for Money (ROI)" },
    { id: "branch_strength", label: "Branch Specialization Strength" },
    { id: "college_life", label: "College Life & Infrastructure" },
    { id: "curriculum", label: "Modern Curriculum & Faculty" },
  ]);

  // Student details state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Available options for suggestions
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

  const BRANCH_OPTIONS = [
    { code: "CSE", label: "Computer Science & Engineering (CSE)" },
    { code: "IT", label: "Information Technology (IT)" },
    { code: "ECE", label: "Electronics & Communication (ECE)" },
    { code: "ME", label: "Mechanical Engineering (ME)" },
    { code: "CE", label: "Civil Engineering (CE)" },
  ];

  // Helper: Add preferred location
  const handleAddLocation = () => {
    if (!stateInput) return;
    
    // Check duplication
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

  // Helper: Shift priorities in ranking
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
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !phone) {
      setError("Please fill in all contact information fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        student: {
          name,
          email,
          phone,
          jee_percentile: jeePercentile ? parseFloat(jeePercentile) : null,
          class_12_percentage: class12Percentage ? parseFloat(class12Percentage) : null,
          budget_limit: isBudgetConstraint ? budgetLimit : null,
          is_budget_constraint: isBudgetConstraint,
          restrict_location: restrictLocation,
          locations: selectedLocations,
        },
        priorities: priorities.map((p, index) => ({
          criteria: p.id,
          rankOrder: index + 1,
        })),
        preferred_branches: preferredBranches,
      };

      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate recommendations");
      }

      // Route to results page passing the student_id
      router.push(`/results?student_id=${data.student_id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.wizardHeader}>
        <div className={styles.logo}>CollegeMatch</div>
        <div className={styles.stepIndicator}>Step {step} of 6</div>
      </header>

      <div className={styles.progressTrack}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${(step / 6) * 100}%` }}
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

          {/* STEP 4: BRANCH PREFERENCES */}
          {step === 4 && (
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
                          onChange={() => {}} // Controlled by row click
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

          {/* STEP 5: PRIORITY RANKING */}
          {step === 5 && (
            <div>
              <h2 className={styles.stepTitle}>Rank your preferences</h2>
              <p className={styles.stepDesc}>
                Arrange the categories from **MOST IMPORTANT** (top) to **LEAST IMPORTANT** (bottom). 
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
                <button type="button" className="btn btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: CONTACT INFORMATION & SUBMIT */}
          {step === 6 && (
            <form onSubmit={handleSubmit}>
              <h2 className={styles.stepTitle}>Where should we send your results?</h2>
              <p className={styles.stepDesc}>
                Enter your details to generate your customized top 10 best-fit college recommendation sheet.
              </p>

              <div className={styles.formGroup} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", margin: "1.5rem 0" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.95rem" }}>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Rohan Sharma" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.95rem" }}>Email Address</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. rohan.sharma@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.95rem" }}>Mobile Number</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. +91 98765 43210" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={handleBack} disabled={loading}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary glow-effect" disabled={loading}>
                  {loading ? "Calculating Matches..." : "Get My Matches"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
