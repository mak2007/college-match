"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./quality.module.css";

interface BranchDist {
  branchCode: string;
  count: number;
  collegesWithSalary: number;
  collegesWithPlacement: number;
  collegesWithCutoff: number;
}

interface CollegeQuality {
  name: string;
  branchCount: number;
  missingSalary: number;
  missingPlacement: number;
  missingCutoff: number;
  hasScholarships: boolean;
  hasPathways: boolean;
}

interface DuplicateWarning {
  type: string;
  message: string;
  colleges: string[];
}

interface QualityData {
  summary: {
    totalColleges: number;
    totalBranches: number;
    totalScholarships: number;
    totalPathways: number;
    overallHealth: number;
  };
  branchDistribution: BranchDist[];
  missingData: {
    missingSalaryCount: number;
    missingPlacementCount: number;
    missingCutoffCount: number;
    totalBranchSlots: number;
  };
  collegesWithoutBranches: string[];
  collegesWithoutScholarships: string[];
  collegesWithoutPathways: string[];
  collegeQuality: CollegeQuality[];
  duplicateWarnings: DuplicateWarning[];
}

function healthClass(score: number): string {
  if (score >= 80) return styles.healthGood;
  if (score >= 50) return styles.healthWarn;
  return styles.healthBad;
}

export default function DataQualityPage() {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchQuality = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/data-quality");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuality(); }, [fetchQuality]);

  if (loading && !data) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="skeleton" style={{ height: "24px", width: "200px", marginBottom: "1.5rem" }} />
        <div className="skeleton" style={{ height: "120px", marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: "300px" }} />
      </div>
    );
  }

  if (error) {
    return <div className="emptyState">Error: {error}</div>;
  }

  if (!data) return null;

  const { summary, branchDistribution, missingData, collegesWithoutBranches, collegesWithoutScholarships, collegesWithoutPathways, collegeQuality, duplicateWarnings } = data;

  const salaryPct = missingData.totalBranchSlots > 0
    ? Math.round(((missingData.totalBranchSlots - missingData.missingSalaryCount) / missingData.totalBranchSlots) * 100)
    : 0;
  const placementPct = missingData.totalBranchSlots > 0
    ? Math.round(((missingData.totalBranchSlots - missingData.missingPlacementCount) / missingData.totalBranchSlots) * 100)
    : 0;
  const cutoffPct = missingData.totalBranchSlots > 0
    ? Math.round(((missingData.totalBranchSlots - missingData.missingCutoffCount) / missingData.totalBranchSlots) * 100)
    : 0;

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className="sectionTitle" style={{ margin: 0 }}>Data Quality Dashboard</h1>
        <button className={styles.refreshBtn} onClick={fetchQuality} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ─── Summary Cards ──────────────────────────────────── */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>Overall Health</div>
          <div className={styles.value}>{summary.overallHealth}%</div>
          <div className={styles.healthBar}>
            <div className={`${styles.healthFill} ${healthClass(summary.overallHealth)}`} style={{ width: `${summary.overallHealth}%` }} />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Total Colleges</div>
          <div className={styles.value}>{summary.totalColleges}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Total Branches</div>
          <div className={styles.value}>{summary.totalBranches}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Scholarships</div>
          <div className={styles.value}>{summary.totalScholarships}</div>
        </div>
      </div>

      {/* ─── Completeness Bars ──────────────────────────────── */}
      <div className={`${styles.card} ${styles.cardFull}`} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.label}>Field Completeness</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginTop: "1rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Salary Data</span>
              <span style={{ fontSize: "0.85rem", color: "var(--light-text-secondary)" }}>{salaryPct}% ({missingData.totalBranchSlots - missingData.missingSalaryCount}/{missingData.totalBranchSlots})</span>
            </div>
            <div className={styles.healthBar}>
              <div className={`${styles.healthFill} ${healthClass(salaryPct)}`} style={{ width: `${salaryPct}%` }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Placement %</span>
              <span style={{ fontSize: "0.85rem", color: "var(--light-text-secondary)" }}>{placementPct}% ({missingData.totalBranchSlots - missingData.missingPlacementCount}/{missingData.totalBranchSlots})</span>
            </div>
            <div className={styles.healthBar}>
              <div className={`${styles.healthFill} ${healthClass(placementPct)}`} style={{ width: `${placementPct}%` }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cutoff Data</span>
              <span style={{ fontSize: "0.85rem", color: "var(--light-text-secondary)" }}>{cutoffPct}% ({missingData.totalBranchSlots - missingData.missingCutoffCount}/{missingData.totalBranchSlots})</span>
            </div>
            <div className={styles.healthBar}>
              <div className={`${styles.healthFill} ${healthClass(cutoffPct)}`} style={{ width: `${cutoffPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Branch Distribution ────────────────────────────── */}
      <div className={`${styles.card} ${styles.cardHalf}`} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.label}>Branch Distribution</div>
        <div style={{ marginTop: "1rem" }}>
          {branchDistribution.map((b) => {
            const maxCount = Math.max(...branchDistribution.map((x) => x.count), 1);
            const barWidth = (b.count / maxCount) * 100;
            return (
              <div key={b.branchCode} className={styles.branchRow}>
                <span className={styles.branchCode}>{b.branchCode}</span>
                <div className={styles.branchBar}>
                  <div className={styles.branchBarFill} style={{ width: `${barWidth}%` }} />
                </div>
                <span className={styles.branchCount}>{b.count} branches</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--light-text-secondary)" }}>
          {branchDistribution.map((b) => (
            <span key={b.branchCode} style={{ marginRight: "1rem" }}>
              {b.branchCode}: {b.collegesWithSalary}/{b.count} salary, {b.collegesWithPlacement}/{b.count} placement
            </span>
          ))}
        </div>
      </div>

      {/* ─── Warnings ───────────────────────────────────────── */}
      <div className={`${styles.card} ${styles.cardHalf}`} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.label}>Warnings</div>
        <div style={{ marginTop: "0.75rem" }}>
          {collegesWithoutBranches.length > 0 && (
            <div className={styles.warningBox}>
              <div className={styles.warningTitle}>
                <span className={`${styles.pill} ${styles.pillRed}`}>{collegesWithoutBranches.length}</span>
                Colleges Without Branches
              </div>
              <div className={styles.warningDetail}>{collegesWithoutBranches.join(", ")}</div>
            </div>
          )}
          {collegesWithoutScholarships.length > 0 && (
            <div className={styles.warningBox}>
              <div className={styles.warningTitle}>
                <span className={`${styles.pill} ${styles.pillYellow}`}>{collegesWithoutScholarships.length}</span>
                Colleges Without Scholarships
              </div>
              <div className={styles.warningDetail}>{collegesWithoutScholarships.join(", ")}</div>
            </div>
          )}
          {collegesWithoutPathways.length > 0 && (
            <div className={styles.warningBox}>
              <div className={styles.warningTitle}>
                <span className={`${styles.pill} ${styles.pillYellow}`}>{collegesWithoutPathways.length}</span>
                Colleges Without Admission Pathways
              </div>
              <div className={styles.warningDetail}>{collegesWithoutPathways.join(", ")}</div>
            </div>
          )}
          {duplicateWarnings.map((w, i) => (
            <div key={i} className={styles.warningBox}>
              <div className={styles.warningTitle}>
                <span className={`${styles.pill} ${styles.pillRed}`}>{w.type}</span>
                {w.message}
              </div>
              <div className={styles.warningDetail}>{w.colleges.join(", ")}</div>
            </div>
          ))}
          {collegesWithoutBranches.length === 0 && collegesWithoutScholarships.length === 0 && collegesWithoutPathways.length === 0 && duplicateWarnings.length === 0 && (
            <div style={{ color: "var(--light-text-secondary)", fontSize: "0.85rem", padding: "1rem 0" }}>
              No warnings detected.
            </div>
          )}
        </div>
      </div>

      {/* ─── College-Level Detail Table ─────────────────────── */}
      <div className={`${styles.card} ${styles.cardFull}`}>
        <div className={styles.label}>College Data Quality</div>
        <div style={{ marginTop: "1rem", overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>College</th>
                <th style={{ textAlign: "center" }}>Branches</th>
                <th style={{ textAlign: "center" }}>Missing Salary</th>
                <th style={{ textAlign: "center" }}>Missing Placement</th>
                <th style={{ textAlign: "center" }}>Missing Cutoff</th>
                <th style={{ textAlign: "center" }}>Scholarships</th>
                <th style={{ textAlign: "center" }}>Pathways</th>
              </tr>
            </thead>
            <tbody>
              {collegeQuality
                .sort((a, b) => (b.missingSalary + b.missingPlacement + b.missingCutoff) - (a.missingSalary + a.missingPlacement + a.missingCutoff))
                .map((c) => {
                  const totalIssues = c.missingSalary + c.missingPlacement + c.missingCutoff;
                  return (
                    <tr key={c.name} style={{ opacity: totalIssues > 3 ? 0.7 : 1 }}>
                      <td style={{ fontWeight: 600, maxWidth: "250px" }}>{c.name}</td>
                      <td style={{ textAlign: "center" }}>{c.branchCount}</td>
                      <td style={{ textAlign: "center" }} className={c.missingSalary > 0 ? styles.missingCell : styles.okCell}>
                        {c.missingSalary > 0 ? `${c.missingSalary}` : "✓"}
                      </td>
                      <td style={{ textAlign: "center" }} className={c.missingPlacement > 0 ? styles.missingCell : styles.okCell}>
                        {c.missingPlacement > 0 ? `${c.missingPlacement}` : "✓"}
                      </td>
                      <td style={{ textAlign: "center" }} className={c.missingCutoff > 0 ? styles.missingCell : styles.okCell}>
                        {c.missingCutoff > 0 ? `${c.missingCutoff}` : "✓"}
                      </td>
                      <td style={{ textAlign: "center" }} className={c.hasScholarships ? styles.okCell : styles.missingCell}>
                        {c.hasScholarships ? "✓" : "✗"}
                      </td>
                      <td style={{ textAlign: "center" }} className={c.hasPathways ? styles.okCell : styles.missingCell}>
                        {c.hasPathways ? "✓" : "✗"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
