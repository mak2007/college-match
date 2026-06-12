"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./results.module.css";

interface Recommendation {
  id: string;
  matchScore: number;
  qualityScore: number;
  admissionProbability: number;
  rankPosition: number;
  branchCode: string;
  reasons: string;
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    branches: Array<{
      branchCode: string;
      branchName: string;
      tuitionFeeAnnual: number;
      hostelFeeAnnual: number;
      avgSalary: number | null;
      medianSalary: number | null;
      highestSalary: number | null;
      minJeePercentileCutoff: number | null;
      minClass12Cutoff: number | null;
      placementPercentage: number | null;
    }>;
  };
}

interface ResultsClientProps {
  student: {
    id: string;
    name: string;
    jeePercentile: number | null;
    class12Percentage: number | null;
    budgetLimit: number | null;
  };
  recommendations: Recommendation[];
}

type SortMode = "best_fit" | "best_colleges" | "admission_chance";
type BucketFilter = "all" | "Dream" | "Target" | "Safe";

function getAdmissionCategory(
  jeePercentile: number | null,
  class12Percentage: number | null,
  minJeeCutoff: number | null,
  minClass12Cutoff: number | null
): "Dream" | "Target" | "Safe" {
  const jeeGap =
    jeePercentile && minJeeCutoff ? jeePercentile - minJeeCutoff : null;
  const c12Gap =
    class12Percentage && minClass12Cutoff
      ? class12Percentage - minClass12Cutoff
      : null;

  const gap =
    jeeGap !== null && c12Gap !== null
      ? Math.max(jeeGap, c12Gap)
      : jeeGap !== null
        ? jeeGap
        : c12Gap;

  if (gap === null) return "Target";
  if (gap >= 5) return "Safe";
  if (gap < 0) return "Dream";
  return "Target";
}

function getAdmissionProbability(
  jeePercentile: number | null,
  class12Percentage: number | null,
  minJeeCutoff: number | null,
  minClass12Cutoff: number | null
): number {
  const jeeGap =
    jeePercentile && minJeeCutoff ? jeePercentile - minJeeCutoff : null;
  const c12Gap =
    class12Percentage && minClass12Cutoff
      ? class12Percentage - minClass12Cutoff
      : null;

  const gap =
    jeeGap !== null && c12Gap !== null
      ? Math.max(jeeGap, c12Gap)
      : jeeGap !== null
        ? jeeGap
        : c12Gap;

  if (gap === null) return 50;
  if (gap >= 10) return 95;
  if (gap >= 7) return 85;
  if (gap >= 5) return 75;
  if (gap >= 3) return 60;
  if (gap >= 1) return 45;
  if (gap >= 0) return 35;
  if (gap >= -2) return 20;
  return 10;
}

export default function ResultsClient({
  student,
  recommendations,
}: ResultsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("best_fit");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");

  const sortedAndFiltered = useMemo(() => {
    // Enrich recommendations with computed fields
    const enriched = recommendations.map((rec) => {
      const branch = rec.college.branches.find(
        (b) => b.branchCode === rec.branchCode
      );
      const category = getAdmissionCategory(
        student.jeePercentile,
        student.class12Percentage,
        branch?.minJeePercentileCutoff ?? null,
        branch?.minClass12Cutoff ?? null
      );
      const admissionProb = getAdmissionProbability(
        student.jeePercentile,
        student.class12Percentage,
        branch?.minJeePercentileCutoff ?? null,
        branch?.minClass12Cutoff ?? null
      );
      return { ...rec, category, admissionProb };
    });

    // Filter by bucket
    const filtered =
      bucketFilter === "all"
        ? enriched
        : enriched.filter((r) => r.category === bucketFilter);

    // Sort by mode
    return filtered.sort((a, b) => {
      if (sortMode === "best_colleges") {
        return b.qualityScore - a.qualityScore;
      } else if (sortMode === "admission_chance") {
        return b.admissionProb - a.admissionProb;
      } else {
        return b.matchScore - a.matchScore;
      }
    });
  }, [recommendations, sortMode, bucketFilter, student]);

  const bucketCounts = useMemo(() => {
    const counts = { Dream: 0, Target: 0, Safe: 0 };
    recommendations.forEach((rec) => {
      const branch = rec.college.branches.find(
        (b) => b.branchCode === rec.branchCode
      );
      const cat = getAdmissionCategory(
        student.jeePercentile,
        student.class12Percentage,
        branch?.minJeePercentileCutoff ?? null,
        branch?.minClass12Cutoff ?? null
      );
      counts[cat]++;
    });
    return counts;
  }, [recommendations, student]);

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <header className={styles.header}>
        <div
          className="container flex-center"
          style={{ justifyContent: "space-between", height: "70px" }}
        >
          <Link href="/" className={styles.logo}>
            CollegeMatch
          </Link>
          <div className={styles.studentBadge}>{student.name}</div>
        </div>
      </header>

      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        {/* Header */}
        <section className={styles.resultsHeader}>
          <h1 className={styles.title}>Your College Recommendations</h1>
          <p className={styles.subtitle}>
            Based on your priorities, academic profile, and a 4-year budget of{" "}
            <strong>
              {student.budgetLimit
                ? `₹${(Number(student.budgetLimit) / 100000).toFixed(1)} Lakh`
                : "No Constraint"}
            </strong>
            .
          </p>
        </section>

        {recommendations.length === 0 ? (
          <div style={{ margin: "2rem auto", maxWidth: "600px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <h3 style={{ color: "#0F2D52" }}>No matches found</h3>
            <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
              Try adjusting your preferences.
            </p>
            <Link href="/wizard" className="btn btn-primary">
              Adjust Preferences
            </Link>
          </div>
        ) : (
          <>
            {/* ─── Mode Selector ────────────────────────────── */}
            <div className={styles.modeSelector}>
              <div className={styles.modeLabel}>Sort by:</div>
              <div className={styles.modeButtons}>
                <button
                  className={`${styles.modeBtn} ${sortMode === "best_fit" ? styles.modeBtnActive : ""}`}
                  onClick={() => setSortMode("best_fit")}
                >
                  Best Fit
                  <span className={styles.modeHint}>Personalized</span>
                </button>
                <button
                  className={`${styles.modeBtn} ${sortMode === "best_colleges" ? styles.modeBtnActive : ""}`}
                  onClick={() => setSortMode("best_colleges")}
                >
                  Best Colleges
                  <span className={styles.modeHint}>Quality first</span>
                </button>
                <button
                  className={`${styles.modeBtn} ${sortMode === "admission_chance" ? styles.modeBtnActive : ""}`}
                  onClick={() => setSortMode("admission_chance")}
                >
                  Admission Chance
                  <span className={styles.modeHint}>Easiest first</span>
                </button>
              </div>
            </div>

            {/* ─── Bucket Filters ────────────────────────────── */}
            <div className={styles.bucketFilters}>
              <button
                className={`${styles.bucketBtn} ${bucketFilter === "all" ? styles.bucketBtnActive : ""}`}
                onClick={() => setBucketFilter("all")}
              >
                All ({recommendations.length})
              </button>
              <button
                className={`${styles.bucketBtn} ${bucketFilter === "Dream" ? styles.bucketBtnDream : ""}`}
                onClick={() => setBucketFilter("Dream")}
              >
                Dream ({bucketCounts.Dream})
              </button>
              <button
                className={`${styles.bucketBtn} ${bucketFilter === "Target" ? styles.bucketBtnTarget : ""}`}
                onClick={() => setBucketFilter("Target")}
              >
                Target ({bucketCounts.Target})
              </button>
              <button
                className={`${styles.bucketBtn} ${bucketFilter === "Safe" ? styles.bucketBtnSafe : ""}`}
                onClick={() => setBucketFilter("Safe")}
              >
                Safe ({bucketCounts.Safe})
              </button>
            </div>

            {/* ─── Results List ──────────────────────────────── */}
            <div className={styles.resultsList}>
              {sortedAndFiltered.map((rec, idx) => {
                const branch = rec.college.branches.find(
                  (b) => b.branchCode === rec.branchCode
                );
                if (!branch) return null;

                let reasonsList: string[] = [];
                try {
                  reasonsList = JSON.parse(rec.reasons);
                } catch {
                  reasonsList = [String(rec.reasons)];
                }

                const total4YrCost =
                  (branch.tuitionFeeAnnual + branch.hostelFeeAnnual) * 4;

                const bucketClass =
                  rec.category === "Dream"
                    ? styles.badgeDream
                    : rec.category === "Safe"
                      ? styles.badgeSafe
                      : styles.badgeTarget;

                const applyRedirectUrl = `/api/leads/apply?student_id=${student.id}&college_id=${rec.college.id}&branch_code=${rec.branchCode}`;

                return (
                  <div key={rec.id} className={styles.collegeCard}>
                    {/* Card Header */}
                    <div className={styles.cardHeader}>
                      <div className={styles.collegeMeta}>
                        <span className={styles.rankBadge}>
                          #{idx + 1}
                        </span>
                        <div>
                          <h2 className={styles.collegeName}>
                            {rec.college.name}
                          </h2>
                          <p className={styles.collegeLocation}>
                            {rec.college.city}, {rec.college.state}
                          </p>
                        </div>
                      </div>
                      <div className={styles.scoresRow}>
                        <div className={styles.scoreBlock}>
                          <div className={styles.scoreLabel}>Match</div>
                          <div className={styles.scoreVal}>
                            {Number(rec.matchScore).toFixed(0)}%
                          </div>
                        </div>
                        <div className={styles.scoreBlock}>
                          <div className={styles.scoreLabel}>Admission</div>
                          <div className={styles.scoreValSmall}>
                            {rec.admissionProb}%
                          </div>
                        </div>
                        <div className={styles.bucketBadgeWrapper}>
                          <span className={`${styles.bucketBadge} ${bucketClass}`}>
                            {rec.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Branch */}
                    <div className={styles.branchBox}>
                      <span className={styles.branchBadge}>
                        {branch.branchCode}
                      </span>
                      <span className={styles.branchTitle}>
                        {branch.branchName}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.cardGrid}>
                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>Placements</h4>
                        <div className={styles.statRow}>
                          <span>Average Package:</span>
                          <strong>
                            ₹{(Number(branch.avgSalary) / 100000).toFixed(2)} LPA
                          </strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Median Package:</span>
                          <strong>
                            ₹{(Number(branch.medianSalary) / 100000).toFixed(2)} LPA
                          </strong>
                        </div>
                        {branch.highestSalary && (
                          <div className={styles.statRow}>
                            <span>Highest Package:</span>
                            <strong>
                              ₹
                              {(
                                Number(branch.highestSalary) / 100000
                              ).toFixed(2)}{" "}
                              LPA
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>
                          4-Year Financials
                        </h4>
                        <div className={styles.statRow}>
                          <span>Annual Tuition:</span>
                          <strong>
                            ₹
                            {(
                              Number(branch.tuitionFeeAnnual) / 100000
                            ).toFixed(2)}{" "}
                            L
                          </strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Annual Hostel:</span>
                          <strong>
                            ₹
                            {(
                              Number(branch.hostelFeeAnnual) / 100000
                            ).toFixed(2)}{" "}
                            L
                          </strong>
                        </div>
                        <div className={styles.totalRow}>
                          <span>Est. Total Cost:</span>
                          <strong>
                            ₹{(total4YrCost / 100000).toFixed(2)} Lakh
                          </strong>
                        </div>
                      </div>

                      <div
                        className={styles.gridSection}
                        style={{ borderRight: "none" }}
                      >
                        <h4 className={styles.sectionTitle}>Cutoffs</h4>
                        <p className={styles.cutoffSubtext}>
                          JEE Percentile:{" "}
                          {branch.minJeePercentileCutoff
                            ? `~${branch.minJeePercentileCutoff}%`
                            : "N/A"}
                          <br />
                          Class 12:{" "}
                          {branch.minClass12Cutoff
                            ? `~${branch.minClass12Cutoff}%`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Reasons & Action */}
                    <div className={styles.cardFooter}>
                      <div className={styles.reasonsList}>
                        {reasonsList.map((reason, idx) => (
                          <div key={idx} className={styles.reasonItem}>
                            {reason}
                          </div>
                        ))}
                      </div>
                      <div className={styles.actionBtn}>
                        <a
                          href={applyRedirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{
                            padding: "0.75rem 1.5rem",
                            fontSize: "0.95rem",
                          }}
                        >
                          Apply Official Link
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
