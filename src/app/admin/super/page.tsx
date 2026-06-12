"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./super.module.css";

interface Stats {
  totalLeads: number;
  partnerCollegesCount: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
}

interface RecentLead {
  id: string;
  status: string;
  branchCode: string;
  referredAt: string;
  student: { name: string; phone: string };
  college: { name: string };
  commissionTransaction: { amountDue: number } | null;
}

interface CollegeRow {
  id: string;
  name: string;
  city: string;
  isPartner: boolean;
  commissionRate: number;
  leadsCount: number;
  enrollmentsCount: number;
  revenueEarned: number;
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ minHeight: "100px" }}>
      <div className="skeleton" style={{ height: "16px", width: "60%", marginBottom: "0.75rem" }} />
      <div className="skeleton" style={{ height: "28px", width: "40%" }} />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="glass-card" style={{ gridColumn: "span 2" }}>
      <div className="skeleton" style={{ height: "20px", width: "30%", marginBottom: "1.5rem" }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--light-border)" }}>
          <div className="skeleton" style={{ height: "16px", flex: 2 }} />
          <div className="skeleton" style={{ height: "16px", flex: 1 }} />
          <div className="skeleton" style={{ height: "16px", flex: 1 }} />
          <div className="skeleton" style={{ height: "16px", flex: 0.5 }} />
          <div className="skeleton" style={{ height: "16px", flex: 0.5 }} />
          <div className="skeleton" style={{ height: "16px", flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonLeads() {
  return (
    <div className="glass-card">
      <div className="skeleton" style={{ height: "20px", width: "40%", marginBottom: "1.5rem" }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ padding: "1rem 0", borderBottom: "1px solid var(--light-border)" }}>
          <div className="skeleton" style={{ height: "16px", width: "50%", marginBottom: "0.5rem" }} />
          <div className="skeleton" style={{ height: "14px", width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [collegesList, setCollegesList] = useState<CollegeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const data = await res.json();
      setStats(data.stats);
      setRecentLeads(data.recentLeads);
      setCollegesList(data.collegesList);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecompute = async () => {
    if (!confirm("This will regenerate recommendations for ALL students using current college data. Continue?")) return;
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const res = await fetch("/api/admin/recompute-recommendations", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRecomputeResult(`Done: ${data.updated}/${data.totalStudents} students updated. ${data.errors > 0 ? `${data.errors} errors.` : ""}`);
      } else {
        setRecomputeResult(`Error: ${data.error}`);
      }
    } catch {
      setRecomputeResult("Error: Network request failed");
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        {/* Statistics Cards */}
        <section className={styles.statsGrid}>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <div className="glass-card animate-fade">
                <div className={styles.statLabel}>Total Referrals</div>
                <div className={styles.statVal}>{stats?.totalLeads ?? 0}</div>
              </div>
              <div className="glass-card animate-fade">
                <div className={styles.statLabel}>Partner Colleges</div>
                <div className={styles.statVal}>{stats?.partnerCollegesCount ?? 0}</div>
              </div>
              <div className="glass-card animate-fade">
                <div className={styles.statLabel}>Total Commission Pipeline</div>
                <div className={styles.statVal} style={{ color: "var(--primary-color)" }}>
                  ₹{((stats?.totalCommission ?? 0) / 100000).toFixed(2)} L
                </div>
              </div>
              <div className="glass-card animate-fade">
                <div className={styles.statLabel}>Settled Commissions</div>
                <div className={styles.statVal} style={{ color: "var(--color-success)" }}>
                  ₹{((stats?.paidCommission ?? 0) / 100000).toFixed(2)} L
                </div>
              </div>
            </>
          )}
        </section>

        {/* Recompute Action */}
        <section style={{ marginBottom: "2rem" }}>
          <div className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0F2D52", margin: 0 }}>Recompute Recommendations</h3>
              <p style={{ fontSize: "0.8rem", color: "#8c8c8c", margin: "0.25rem 0 0" }}>
                Regenerate all student recommendations using current college data (placement, cutoffs, scores, New Gen status)
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {recomputeResult && (
                <span style={{ fontSize: "0.8rem", color: recomputeResult.startsWith("Done") ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                  {recomputeResult}
                </span>
              )}
              <button
                onClick={handleRecompute}
                disabled={recomputing}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: recomputing ? "#94a3b8" : "#0F2D52",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: recomputing ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {recomputing ? "Recomputing..." : "Recompute All"}
              </button>
            </div>
          </div>
        </section>

        {/* main Grid layouts */}
        <div className={styles.contentGrid}>
          {loading ? (
            <>
              <SkeletonTable />
              <SkeletonLeads />
            </>
          ) : (
            <>
              {/* Colleges list */}
              <section className="glass-card animate-fade" style={{ gridColumn: "span 2" }}>
                <h3 className={styles.sectionTitle}>Partner Institutes Performance</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>College Name</th>
                        <th>Location</th>
                        <th>Rate</th>
                        <th>Leads</th>
                        <th>Enrolled</th>
                        <th>Revenue Pipeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collegesList.map((col) => (
                        <tr key={col.id}>
                          <td style={{ fontWeight: "600" }}>{col.name}</td>
                          <td>📍 {col.city}</td>
                          <td>₹{col.commissionRate.toLocaleString("en-IN")}</td>
                          <td>{col.leadsCount}</td>
                          <td style={{ color: col.enrollmentsCount > 0 ? "var(--secondary-color)" : "inherit" }}>
                            {col.enrollmentsCount}
                          </td>
                          <td style={{ fontWeight: "700" }}>₹{col.revenueEarned.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Recent conversion leads */}
              <section className="glass-card animate-fade">
                <h3 className={styles.sectionTitle}>Recent Leads Conversions</h3>
                <div className={styles.leadsList}>
                  {recentLeads.map((l) => {
                    let badgeClass = styles.badgeReferred;
                    if (l.status === "ENROLLED") badgeClass = styles.badgeEnrolled;
                    if (l.status === "APPLIED") badgeClass = styles.badgeApplied;
                    if (l.status === "REJECTED") badgeClass = styles.badgeRejected;

                    return (
                      <div key={l.id} className={styles.leadItem}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{l.student.name}</strong>
                          <span className={`${styles.statusBadge} ${badgeClass}`}>
                            {l.status}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                          👉 {l.college.name} ({l.branchCode})
                        </p>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                          <span>Ph: {l.student.phone}</span>
                          <span>Ref Date: {new Date(l.referredAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                  {recentLeads.length === 0 && (
                    <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
                      No lead referrals generated yet.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
