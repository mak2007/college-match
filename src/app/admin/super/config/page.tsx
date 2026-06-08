"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./config.module.css";

interface ScoringConfig {
  weightStrategy: "ROC" | "EQUAL" | "MANUAL";
  manualWeights: {
    PLACEMENTS: number;
    ROI: number;
    BRANCH_STRENGTH: number;
    COLLEGE_LIFE: number;
    CURRICULUM: number;
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

export default function SuperadminConfig() {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load configuration and metrics on mount
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

    // Validate manual weights sum to 1.0 (or close) if strategy is MANUAL
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

  // Helper to update fields nested inside config state
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
                    value="ROC" 
                    checked={config.weightStrategy === "ROC"}
                    onChange={() => updateConfig(prev => ({ ...prev, weightStrategy: "ROC" }))}
                  />
                  <span>Rank-Order Centroid (ROC) Weights (Dynamically maps weights from student rank)</span>
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
            </div>

            {/* COLUMN 2: PENALTIES */}
            <div className="glass-card">
              <h3 className={styles.cardTitle}>2. Penalty Settings</h3>

              {/* Budget Penalties */}
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

              {/* Academics competitiveness */}
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

            {/* COLUMN 3: DYNAMIC CUSTOM ATTRIBUTES */}
            <div className="glass-card" style={{ gridColumn: "span 2" }}>
              <h3 className={styles.cardTitle}>3. Custom College Attributes & Weights</h3>
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
