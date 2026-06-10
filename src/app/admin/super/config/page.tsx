"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./config.module.css";

type CareerGoalType = "PLACEMENT" | "STARTUP" | "HIGHER_STUDIES_INDIA" | "HIGHER_STUDIES_ABROAD" | "GOVERNMENT_EXAMS" | "NOT_SURE";

interface CareerGoalWeights {
  PLACEMENTS: number;
  ROI: number;
  BRANCH_STRENGTH: number;
  COLLEGE_LIFE: number;
  CURRICULUM: number;
}

interface ScoringConfig {
  weightStrategy: "CAREER_GOAL_PRIORITY" | "ROC" | "EQUAL" | "MANUAL";
  manualWeights: {
    PLACEMENTS: number;
    ROI: number;
    BRANCH_STRENGTH: number;
    COLLEGE_LIFE: number;
    CURRICULUM: number;
  };
  careerGoalWeights: Record<CareerGoalType, CareerGoalWeights>;
  priorityAdjustment: {
    active: boolean;
    boostPerRank: number;
    maxAdjustment: number;
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

interface GlobalMetrics {
  totalColleges: number;
  totalStudents: number;
  totalLeads: number;
  enrolledCount: number;
  totalCommissionAccrued: number;
}

const CAREER_GOAL_LABELS: Record<CareerGoalType, string> = {
  PLACEMENT: "💼 Get Placed",
  STARTUP: "🚀 Start a Startup",
  HIGHER_STUDIES_INDIA: "🎓 Higher Studies (India)",
  HIGHER_STUDIES_ABROAD: "🌍 Study Abroad",
  GOVERNMENT_EXAMS: "📝 Government Exams",
  NOT_SURE: "🤔 Not Sure Yet",
};

export default function SuperadminConfig() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<CareerGoalType>("PLACEMENT");

  useEffect(() => {
    async function loadConfigAndMetrics() {
      try {
        const configRes = await fetch("/api/admin/config");
        if (!configRes.ok) {
          setError("Unauthorized access or failed to load settings. Please make sure you are logged in as Superadmin.");
          setLoading(false);
          return;
        }
        const configData = await configRes.json();
        setConfig(configData);

        const metricsRes = await fetch("/api/admin/metrics");
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData);
        }
      } catch (err: any) {
        console.error(err);
        setError("Unauthorized access or failed to load settings. Please make sure you are logged in as Superadmin.");
      } finally {
        setLoading(false);
      }
    }
    loadConfigAndMetrics();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setError("");
    setMessage("");

    if (config.weightStrategy === "MANUAL") {
      const sum =
        config.manualWeights.PLACEMENTS +
        config.manualWeights.ROI +
        config.manualWeights.BRANCH_STRENGTH +
        config.manualWeights.COLLEGE_LIFE +
        config.manualWeights.CURRICULUM;

      if (Math.abs(sum - 1.0) > 0.01) {
        setError(`Manual weights must sum to exactly 1.0 (currently: ${sum.toFixed(2)})`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Failed to save configuration");

      setMessage("Scoring configuration updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updater: (prev: ScoringConfig) => ScoringConfig) => {
    if (config) setConfig(updater(config));
  };

  if (loading) return <div className={styles.loading}>Loading system configuration...</div>;
  if (error && !config) {
    return (
      <div className={styles.wrapper}>
        <div className="glass-card text-center" style={{ maxWidth: "500px", margin: "5rem auto" }}>
          <h2>Access Denied</h2>
          <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>{error}</p>
          <Link href="/admin/login" className="btn btn-primary">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        <form onSubmit={handleSave}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 className={styles.title}>Dynamic Scoring Settings</h1>
              <p className={styles.subtitle}>Fine-tune priority weights, penalties, and thresholds in real-time.</p>
            </div>
            <button type="submit" className="btn btn-primary glow-effect" disabled={saving}>
              {saving ? "Saving Changes..." : "Save Configuration"}
            </button>
          </div>

          {metrics && (
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Total Students</div>
                <div className={styles.metricVal}>{metrics.totalStudents}</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Matched Colleges</div>
                <div className={styles.metricVal}>{metrics.totalColleges}</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Referred Leads</div>
                <div className={styles.metricVal}>{metrics.totalLeads}</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Accrued Commissions</div>
                <div className={styles.metricVal} style={{ color: "#34d399" }}>
                  ₹{(metrics.totalCommissionAccrued / 100000).toFixed(1)}L
                </div>
              </div>
            </div>
          )}

          {message && <div className={styles.successAlert}>✓ {message}</div>}
          {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

          <div className={styles.gridContainer}>
            {/* COLUMN 1: WEIGHT STRATEGY */}
            <div className="glass-card">
              <h3 className={styles.cardTitle}>1. Dimension Weights Strategy</h3>

              <div className={styles.formGroup} style={{ margin: "1rem 0" }}>
                <label className={styles.radioWrapper}>
                  <input
                    type="radio"
                    name="strategy"
                    value="CAREER_GOAL_PRIORITY"
                    checked={config.weightStrategy === "CAREER_GOAL_PRIORITY"}
                    onChange={() => updateConfig(prev => ({ ...prev, weightStrategy: "CAREER_GOAL_PRIORITY" }))}
                  />
                  <span>Career Goal Priority (Recommended — uses career goal templates with priority fine-tuning)</span>
                </label>

                <label className={styles.radioWrapper} style={{ marginTop: "0.75rem" }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="ROC"
                    checked={config.weightStrategy === "ROC"}
                    onChange={() => updateConfig(prev => ({ ...prev, weightStrategy: "ROC" }))}
                  />
                  <span>Rank-Order Centroid (ROC) Weights (Legacy — dynamically maps weights from student rank)</span>
                </label>

                <label className={styles.radioWrapper} style={{ marginTop: "0.75rem" }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="EQUAL"
                    checked={config.weightStrategy === "EQUAL"}
                    onChange={() => updateConfig(prev => ({ ...prev, weightStrategy: "EQUAL" }))}
                  />
                  <span>Equal Weights (20% for each core priority)</span>
                </label>

                <label className={styles.radioWrapper} style={{ marginTop: "0.75rem" }}>
                  <input
                    type="radio"
                    name="strategy"
                    value="MANUAL"
                    checked={config.weightStrategy === "MANUAL"}
                    onChange={() => updateConfig(prev => ({ ...prev, weightStrategy: "MANUAL" }))}
                  />
                  <span>Manual Weight Configuration (Hardcoded values below)</span>
                </label>
              </div>

              {config.weightStrategy === "MANUAL" && (
                <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
                  {Object.keys(config.manualWeights).map((key) => {
                    const typedKey = key as keyof typeof config.manualWeights;
                    return (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: "0.9rem" }}>{key}:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1.0"
                          value={config.manualWeights[typedKey]}
                          onChange={(e) => updateConfig(prev => ({
                            ...prev,
                            manualWeights: {
                              ...prev.manualWeights,
                              [typedKey]: parseFloat(e.target.value) || 0
                            }
                          }))}
                          style={{ width: "90px", padding: "0.4rem" }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {config.weightStrategy === "CAREER_GOAL_PRIORITY" && config.priorityAdjustment && (
                <div className="animate-fade" style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8f7f4", borderRadius: "8px" }}>
                  <h4 className={styles.subCardTitle}>Priority Fine-Tuning Settings</h4>
                  <div className={styles.checkboxWrapper} style={{ margin: "0.5rem 0" }}>
                    <input
                      type="checkbox"
                      id="priorityAdjActive"
                      checked={config.priorityAdjustment.active}
                      onChange={(e) => updateConfig(prev => ({
                        ...prev,
                        priorityAdjustment: { ...prev.priorityAdjustment, active: e.target.checked }
                      }))}
                    />
                    <label htmlFor="priorityAdjActive">Enable priority ranking adjustment (±30% boost)</label>
                  </div>
                  {config.priorityAdjustment.active && (
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Boost per rank position</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="0.5"
                          value={config.priorityAdjustment.boostPerRank}
                          onChange={(e) => updateConfig(prev => ({
                            ...prev,
                            priorityAdjustment: { ...prev.priorityAdjustment, boostPerRank: parseFloat(e.target.value) || 0.10 }
                          }))}
                          style={{ padding: "0.4rem", marginTop: "0.25rem", width: "100%" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Max adjustment cap</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1.0"
                          value={config.priorityAdjustment.maxAdjustment}
                          onChange={(e) => updateConfig(prev => ({
                            ...prev,
                            priorityAdjustment: { ...prev.priorityAdjustment, maxAdjustment: parseFloat(e.target.value) || 0.30 }
                          }))}
                          style={{ padding: "0.4rem", marginTop: "0.25rem", width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COLUMN 2: PENALTIES */}
            <div className="glass-card">
              <h3 className={styles.cardTitle}>2. Penalty Settings</h3>

              <div style={{ marginBottom: "2rem" }}>
                <h4 className={styles.subCardTitle}>Budget Penalty Soft Limits</h4>
                <div className={styles.checkboxWrapper} style={{ margin: "0.5rem 0" }}>
                  <input
                    type="checkbox"
                    id="budgetActive"
                    checked={config.budgetPenalty.active}
                    onChange={(e) => updateConfig(prev => ({
                      ...prev,
                      budgetPenalty: { ...prev.budgetPenalty, active: e.target.checked }
                    }))}
                  />
                  <label htmlFor="budgetActive">Activate budget penalties</label>
                </div>

                {config.budgetPenalty.active && (
                  <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>Limit Multiplier (Exclude threshold):</span>
                        <strong>{config.budgetPenalty.thresholdMultiplier}x</strong>
                      </div>
                      <input
                        type="range"
                        min="1.05"
                        max="2.0"
                        step="0.05"
                        value={config.budgetPenalty.thresholdMultiplier}
                        onChange={(e) => updateConfig(prev => ({
                          ...prev,
                          budgetPenalty: { ...prev.budgetPenalty, thresholdMultiplier: parseFloat(e.target.value) }
                        }))}
                        style={{ width: "100%", accentColor: "var(--primary-color)" }}
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>Base Penalty Weight (Max deduction):</span>
                        <strong>{config.budgetPenalty.basePenaltyWeight} pts</strong>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={config.budgetPenalty.basePenaltyWeight}
                        onChange={(e) => updateConfig(prev => ({
                          ...prev,
                          budgetPenalty: { ...prev.budgetPenalty, basePenaltyWeight: parseInt(e.target.value) }
                        }))}
                        style={{ width: "100%", accentColor: "var(--primary-color)" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className={styles.subCardTitle}>Academic Cutoff Penalties</h4>
                <div className={styles.checkboxWrapper} style={{ margin: "0.5rem 0" }}>
                  <input
                    type="checkbox"
                    id="acadActive"
                    checked={config.academicCompetitiveness.active}
                    onChange={(e) => updateConfig(prev => ({
                      ...prev,
                      academicCompetitiveness: { ...prev.academicCompetitiveness, active: e.target.checked }
                    }))}
                  />
                  <label htmlFor="acadActive">Activate academic fit penalties</label>
                </div>

                {config.academicCompetitiveness.active && (
                  <div className="animate-fade" style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Reach Scale</label>
                        <input
                          type="number"
                          value={config.academicCompetitiveness.reachPenaltyScale}
                          onChange={(e) => updateConfig(prev => ({
                            ...prev,
                            academicCompetitiveness: { ...prev.academicCompetitiveness, reachPenaltyScale: parseFloat(e.target.value) || 0 }
                          }))}
                          style={{ padding: "0.4rem", marginTop: "0.25rem" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Unlikely Scale</label>
                        <input
                          type="number"
                          value={config.academicCompetitiveness.unlikelyPenaltyScale}
                          onChange={(e) => updateConfig(prev => ({
                            ...prev,
                            academicCompetitiveness: { ...prev.academicCompetitiveness, unlikelyPenaltyScale: parseFloat(e.target.value) || 0 }
                          }))}
                          style={{ padding: "0.4rem", marginTop: "0.25rem" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: CAREER GOAL WEIGHT TEMPLATES */}
            {config.weightStrategy === "CAREER_GOAL_PRIORITY" && config.careerGoalWeights && (
              <div className="glass-card" style={{ gridColumn: "span 2" }}>
                <h3 className={styles.cardTitle}>3. Career Goal Weight Templates</h3>
                <p className={styles.stepDesc}>
                  Configure base weights for each career goal. These templates define how each career goal prioritizes the 5 core dimensions.
                </p>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
                  {(Object.keys(CAREER_GOAL_LABELS) as CareerGoalType[]).map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      className={`btn ${selectedGoal === goal ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => setSelectedGoal(goal)}
                    >
                      {CAREER_GOAL_LABELS[goal]}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", padding: "1rem", background: "#f8f7f4", borderRadius: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem" }}>{CAREER_GOAL_LABELS[selectedGoal]} — Base Weights</h4>
                  {(Object.keys(config.careerGoalWeights[selectedGoal]) as (keyof CareerGoalWeights)[]).map((key) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.9rem" }}>{key}:</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1.0"
                        value={config.careerGoalWeights[selectedGoal][key]}
                        onChange={(e) => updateConfig(prev => ({
                          ...prev,
                          careerGoalWeights: {
                            ...prev.careerGoalWeights,
                            [selectedGoal]: {
                              ...prev.careerGoalWeights[selectedGoal],
                              [key]: parseFloat(e.target.value) || 0
                            }
                          }
                        }))}
                        style={{ width: "90px", padding: "0.4rem" }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Sum: {Object.values(config.careerGoalWeights[selectedGoal]).reduce((a, b) => a + b, 0).toFixed(2)} (auto-normalized by engine)
                  </div>
                </div>
              </div>
            )}

            {/* COLUMN 4: CUSTOM ATTRIBUTES */}
            <div className="glass-card" style={{ gridColumn: "span 2" }}>
              <h3 className={styles.cardTitle}>{config.weightStrategy === "CAREER_GOAL_PRIORITY" ? "4" : "3"}. Custom College Attributes & Weights</h3>
              <p className={styles.stepDesc}>
                Define additional college ratings that are weighted alongside core priorities (e.g. NIRF, Infrastructure).
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
                {config.customScoringAttributes.map((attr, idx) => (
                  <div key={attr.key} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="key (e.g. nirf)"
                      value={attr.key}
                      onChange={(e) => updateConfig(prev => {
                        const next = [...prev.customScoringAttributes];
                        next[idx].key = e.target.value.toLowerCase().replace(/\s+/g, "_");
                        return { ...prev, customScoringAttributes: next };
                      })}
                      style={{ flex: 1, padding: "0.4rem" }}
                    />
                    <input
                      type="text"
                      placeholder="Label (e.g. NIRF Ranking)"
                      value={attr.label}
                      onChange={(e) => updateConfig(prev => {
                        const next = [...prev.customScoringAttributes];
                        next[idx].label = e.target.value;
                        return { ...prev, customScoringAttributes: next };
                      })}
                      style={{ flex: 2, padding: "0.4rem" }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Weight (0-1)"
                      value={attr.weight}
                      onChange={(e) => updateConfig(prev => {
                        const next = [...prev.customScoringAttributes];
                        next[idx].weight = parseFloat(e.target.value) || 0;
                        return { ...prev, customScoringAttributes: next };
                      })}
                      style={{ width: "90px", padding: "0.4rem" }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.8rem", color: "var(--accent-color)" }}
                      onClick={() => updateConfig(prev => ({
                        ...prev,
                        customScoringAttributes: prev.customScoringAttributes.filter((_, i) => i !== idx)
                      }))}
                    >
                      Delete
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                  onClick={() => updateConfig(prev => ({
                    ...prev,
                    customScoringAttributes: [...prev.customScoringAttributes, { key: "", label: "", weight: 0.05, defaultValue: 70 }]
                  }))}
                >
                  + Add Custom Attribute
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
