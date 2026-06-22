"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

interface StudentData {
  id: string;
  name: string;
  email: string;
  phone: string;
  jeePercentile: number | null;
  class12Percentage: number | null;
  budgetLimit: number | null;
  isBudgetConstraint: boolean;
  restrictLocation: boolean;
  createdAt: string;
  locations: { state: string; city: string }[];
  priorities: { criteria: string; rankOrder: number }[];
}

interface Stats {
  totalRecommendations: number;
  topMatchScore: number;
  topCollegeName: string | null;
  avgMatchScore: number;
  totalLeads: number;
  leadStatusCounts: Record<string, number>;
}

interface Recommendation {
  id: string;
  rankPosition: number;
  matchScore: number;
  collegeName: string;
  collegeId: string;
  collegeCity: string;
  collegeState: string;
  isPartner: boolean;
  officialApplyUrl: string;
  branchCode: string;
  branchName: string;
  annualTuition: number | null;
  annualHostel: number | null;
  total4YrCost: number | null;
  avgSalary: number | null;
  keyReasons: string[];
  createdAt: string;
}

interface Lead {
  id: string;
  status: string;
  collegeName: string;
  collegeCity: string;
  collegeState: string;
  branchCode: string;
  trackingToken: string;
  referredAt: string;
  statusUpdatedAt: string;
}

interface DashboardData {
  student: StudentData;
  stats: Stats;
  recommendations: Recommendation[];
  leads: Lead[];
}

const CRITERIA_LABELS: Record<string, string> = {
  placements: "💼 Placements & Salaries",
  curriculum: "📖 Modern Course Standards",
  campus_life: "🌴 Campus Life & Crowd",
  research: "🚀 Startup ecosystem",
  extracurriculars: "⚽ Extracurricular Activities",
  PLACEMENTS: "💼 Placements & Salaries",
  CURRICULUM: "📖 Modern Course Standards",
  CAMPUS_LIFE: "🌴 Campus Life & Crowd",
  RESEARCH: "🚀 Startup ecosystem",
  EXTRACURRICULARS: "⚽ Extracurricular Activities and Sports",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  REFERRED:    { label: "Referred",    color: "#6366f1", icon: "🔗" },
  APPLIED:     { label: "Applied",     color: "#06b6d4", icon: "📝" },
  SHORTLISTED: { label: "Shortlisted", color: "#f59e0b", icon: "⭐" },
  ENROLLED:    { label: "Enrolled",    color: "#10b981", icon: "🎓" },
  REJECTED:    { label: "Rejected",    color: "#ef4444", icon: "❌" },
  LAPSED:      { label: "Lapsed",      color: "#6b7280", icon: "⏰" },
};

export default function StudentDashboard() {
  const [studentId, setStudentId] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "leads">("overview");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Check URL params or auth session on mount
  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get("student_id");
      if (sid) {
        setStudentId(sid);
        loadDashboard(sid);
        return;
      }

      // If no student_id query param, check if user is logged in
      try {
        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user && authData.user.email) {
            setLoading(true);
            const lookupRes = await fetch(`/api/student/lookup?email=${encodeURIComponent(authData.user.email)}`);
            if (lookupRes.ok) {
              const studentJson = await lookupRes.json();
              setStudentId(studentJson.id);
              await loadDashboard(studentJson.id);
            } else {
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Auto session lookup failed:", err);
      }
    }
    init();
  }, []);

  async function loadDashboard(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/student/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Not found");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/student/lookup?email=${encodeURIComponent(emailInput.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Student not found");
      setStudentId(json.id);
      await loadDashboard(json.id);
    } catch (err: any) {
      setError(err.message || "Could not find student with that email");
      setLoading(false);
    }
  }

  function showToast(text: string, type: "success" | "error") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }

  function getExistingLead(collegeId: string, branchCode: string): Lead | undefined {
    return data?.leads.find(
      (l) => l.collegeName && l.branchCode === branchCode &&
        data.recommendations.find((r) => r.collegeId === collegeId && r.branchCode === branchCode)
        ? true : false
    ) || data?.leads.find((l) => l.branchCode === branchCode);
  }

  function findLeadForRec(collegeId: string, branchCode: string): Lead | undefined {
    // Check the student API response - leads have collegeName but not collegeId
    // We need to match via the recommendations which have both
    const rec = data?.recommendations.find((r) => r.collegeId === collegeId && r.branchCode === branchCode);
    if (!rec) return undefined;
    return data?.leads.find(
      (l) => l.collegeName === rec.collegeName && l.branchCode === branchCode
    );
  }

  async function handleShortlist(collegeId: string, branchCode: string) {
    const key = `${collegeId}-${branchCode}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/leads/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, collegeId, branchCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Shortlist failed");
      showToast(`⭐ ${json.message}`, "success");
      await loadDashboard(studentId);
    } catch (err: any) {
      showToast(err.message || "Failed to shortlist", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleApply(collegeId: string, branchCode: string) {
    const key = `${collegeId}-${branchCode}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/leads/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, collegeId, branchCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Apply failed");
      showToast(`📝 ${json.message}`, "success");
      await loadDashboard(studentId);
    } catch (err: any) {
      showToast(err.message || "Failed to apply", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleWithdraw(leadId: string) {
    setActionLoading((prev) => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch("/api/college/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status: "LAPSED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Withdraw failed");
      showToast("Application withdrawn successfully", "success");
      await loadDashboard(studentId);
    } catch (err: any) {
      showToast(err.message || "Failed to withdraw", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [leadId]: false }));
    }
  }

  // ---- RENDER: No student loaded → show lookup gate ----
  if (!data) {
    return (
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
            <Link href="/" className={styles.logo}>CollegeMatch</Link>
            <nav className={styles.nav}>
              <Link href="/match" className={styles.navLink}>Live Matcher</Link>
              <Link href="/wizard" className={styles.navLink}>Wizard</Link>
            </nav>
          </div>
        </header>

        <div className={styles.gatePage}>
          <div className={styles.gateCard}>
            <div className={styles.gateIcon}>🎓</div>
            <h1 className={styles.gateTitle}>Student Dashboard</h1>
            <p className={styles.gateSubtitle}>
              Enter the email address you used in the wizard to view your personalised college matches, application leads, and profile.
            </p>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleEmailLookup} className={styles.gateForm}>
              <input
                type="email"
                placeholder="e.g. aarav.mehta@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                id="student-email-lookup"
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Loading..." : "View My Dashboard →"}
              </button>
            </form>

            <p className={styles.gateHint}>
              Haven't taken the wizard yet?{" "}
              <Link href="/wizard" className={styles.gateLink}>Start matching →</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { student, stats, recommendations, leads } = data;

  // ---- RENDER: Dashboard ----
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <Link href="/" className={styles.logo}>CollegeMatch</Link>
          <nav className={styles.nav}>
            <Link href="/match" className={styles.navLink}>Live Matcher</Link>
            <Link href="/wizard" className={styles.navLink}>Redo Wizard</Link>
          </nav>
        </div>
      </header>

      <div className="container" style={{ padding: "2rem 1.5rem 4rem" }}>

        {/* ── Hero Welcome Banner ── */}
        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeAvatar}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.welcomeTitle}>Welcome back, {student.name.split(" ")[0]}! 👋</h1>
            <p className={styles.welcomeSub}>{student.email} · Member since {new Date(student.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          </div>
          <div className={styles.welcomeActions}>
            <Link href={`/match`} className="btn btn-primary">
              ⚡ Re-run Matcher
            </Link>
          </div>
        </div>

        {/* ── KPI Stats Row ── */}
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>🏆</div>
            <div className={styles.kpiValue}>{stats.topMatchScore}%</div>
            <div className={styles.kpiLabel}>Top Match Score</div>
            {stats.topCollegeName && (
              <div className={styles.kpiSub}>{stats.topCollegeName}</div>
            )}
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>📊</div>
            <div className={styles.kpiValue}>{stats.avgMatchScore}%</div>
            <div className={styles.kpiLabel}>Avg Match Score</div>
            <div className={styles.kpiSub}>across {stats.totalRecommendations} colleges</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>🎯</div>
            <div className={styles.kpiValue}>{stats.totalRecommendations}</div>
            <div className={styles.kpiLabel}>Colleges Matched</div>
            <div className={styles.kpiSub}>in your last run</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>📬</div>
            <div className={styles.kpiValue}>{stats.totalLeads}</div>
            <div className={styles.kpiLabel}>Applications Tracked</div>
            <div className={styles.kpiSub}>
              {stats.leadStatusCounts["ENROLLED"] || 0} enrolled
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className={styles.tabBar}>
          {(["overview", "matches", "leads"] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" && "👤 Profile"}
              {tab === "matches" && `🏛️ Matched Colleges (${stats.totalRecommendations})`}
              {tab === "leads" && `📋 Applications (${stats.totalLeads})`}
            </button>
          ))}
        </div>

        {/* ── TAB: PROFILE / OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.overviewGrid}>

              {/* Academic Profile */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>🎓 Academic Profile</h3>
                <div className={styles.infoRows}>
                  <div className={styles.infoRow}>
                    <span>JEE Main Percentile</span>
                    <strong className={styles.highlight}>
                      {student.jeePercentile != null ? `${student.jeePercentile}%ile` : "Not provided"}
                    </strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Class 12 Boards</span>
                    <strong className={styles.highlight}>
                      {student.class12Percentage != null ? `${student.class12Percentage}%` : "Not provided"}
                    </strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>4-Year Budget</span>
                    <strong className={styles.highlight}>
                      {student.isBudgetConstraint && student.budgetLimit != null
                        ? `₹${(Number(student.budgetLimit) / 100000).toFixed(1)} Lakh`
                        : "No Constraint"}
                    </strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Location Filter</span>
                    <strong>{student.restrictLocation ? "Strict (selected regions only)" : "Open to all of India"}</strong>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>📞 Contact Details</h3>
                <div className={styles.infoRows}>
                  <div className={styles.infoRow}>
                    <span>Full Name</span>
                    <strong>{student.name}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Email Address</span>
                    <strong style={{ wordBreak: "break-word" }}>{student.email}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Mobile Number</span>
                    <strong>{student.phone}</strong>
                  </div>
                  <div className={styles.infoRow}>
                    <span>Profile Created</span>
                    <strong>{new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  </div>
                </div>
              </div>

              {/* Priority Rankings */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>⚖️ Your Priority Rankings</h3>
                {student.priorities.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No priorities set yet.</p>
                ) : (
                  <div className={styles.priorityDisplay}>
                    {student.priorities.map((p) => (
                      <div key={p.criteria} className={styles.priorityRow}>
                        <span className={styles.priorityNum}>#{p.rankOrder}</span>
                        <span className={styles.priorityCriteria}>
                          {CRITERIA_LABELS[p.criteria] || p.criteria}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location Preferences */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}>📍 Preferred Locations</h3>
                {student.locations.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Open to colleges anywhere in India.
                  </p>
                ) : (
                  <div className={styles.locationTags}>
                    {student.locations.map((loc, i) => (
                      <span key={i} className={styles.locationTag}>
                        {loc.city ? `${loc.city}, ${loc.state}` : loc.state}
                      </span>
                    ))}
                  </div>
                )}
                <p className={styles.locationNote}>
                  {student.restrictLocation
                    ? "⚠️ Strict filter active — only colleges in selected regions are shown."
                    : "ℹ️ Soft preference — colleges outside these regions are still ranked."}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ── TAB: MATCHED COLLEGES ── */}
        {activeTab === "matches" && (
          <div className={styles.tabContent}>
            {recommendations.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #e6e4dc", borderRadius: "20px", padding: "4rem 2rem", textAlign: "center" }}>
                <h3>No match results yet</h3>
                <p style={{ color: "var(--text-secondary)", margin: "1rem 0 2rem" }}>
                  Run the CollegeMatch wizard or Live Matcher to generate your personalised recommendations.
                </p>
                <Link href="/match" className="btn btn-primary">⚡ Open Live Matcher</Link>
              </div>
            ) : (
              <div className={styles.matchesList}>
                {recommendations.map((rec) => (
                  <article key={rec.id} className={styles.matchCard}>
                    <div className={styles.matchHeader}>
                      <div className={styles.matchMeta}>
                        <span className={styles.matchRank}>#{rec.rankPosition}</span>
                        <div>
                          <h3 className={styles.matchName}>{rec.collegeName}</h3>
                          <p className={styles.matchLoc}>📍 {rec.collegeCity}, {rec.collegeState}</p>
                        </div>
                      </div>
                      <div className={styles.matchScoreWrap}>
                        <span className={styles.matchScoreLabel}>Match Fit</span>
                        <span className={styles.matchScore}>{rec.matchScore}%</span>
                      </div>
                    </div>

                    <div className={styles.matchBranchRow}>
                      <span className={styles.branchPill}>{rec.branchCode}</span>
                      <span className={styles.branchTitle}>{rec.branchName}</span>
                      {rec.isPartner && <span className={styles.partnerBadge}>✓ Partner</span>}
                    </div>


                    {rec.keyReasons.length > 0 && (
                      <div className={styles.matchReasons}>
                        {rec.keyReasons.map((r, i) => (
                          <span key={i} className={styles.reasonChip}>✨ {r}</span>
                        ))}
                      </div>
                    )}

                    <div className={styles.matchFooter}>
                      {(() => {
                        const existingLead = findLeadForRec(rec.collegeId, rec.branchCode);
                        const key = `${rec.collegeId}-${rec.branchCode}`;
                        const isLoading = actionLoading[key];

                        if (existingLead) {
                          const cfg = STATUS_CONFIG[existingLead.status] || { label: existingLead.status, color: "#6b7280", icon: "?" };
                          return (
                            <div className={styles.actionBtnGroup}>
                              <span
                                className={styles.statusPillSmall}
                                style={{
                                  color: cfg.color,
                                  background: `${cfg.color}15`,
                                  borderColor: `${cfg.color}30`,
                                }}
                              >
                                {cfg.icon} {cfg.label}
                              </span>
                              {existingLead.status !== "ENROLLED" && existingLead.status !== "REJECTED" && existingLead.status !== "APPLIED" && (
                                <button
                                  className={styles.applyBtn}
                                  onClick={() => handleApply(rec.collegeId, rec.branchCode)}
                                  disabled={isLoading}
                                >
                                  {isLoading ? "Processing..." : "📝 Apply Now"}
                                </button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className={styles.actionBtnGroup}>
                            <button
                              className={styles.shortlistBtn}
                              onClick={() => handleShortlist(rec.collegeId, rec.branchCode)}
                              disabled={isLoading}
                              id={`shortlist-${rec.collegeId}-${rec.branchCode}`}
                            >
                              {isLoading ? "Saving..." : "⭐ Shortlist"}
                            </button>
                            <button
                              className={styles.applyBtn}
                              onClick={() => handleApply(rec.collegeId, rec.branchCode)}
                              disabled={isLoading}
                              id={`apply-${rec.collegeId}-${rec.branchCode}`}
                            >
                              {isLoading ? "Processing..." : "📝 Apply Now"}
                            </button>
                          </div>
                        );
                      })()}
                      <span className={styles.matchDate}>
                        Matched {new Date(rec.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: APPLICATION LEADS ── */}
        {activeTab === "leads" && (
          <div className={styles.tabContent}>
            {leads.length === 0 ? (
              <div style={{ background: "white", border: "1px solid #e6e4dc", borderRadius: "20px", padding: "4rem 2rem", textAlign: "center" }}>
                <h3>No applications tracked yet</h3>
                <p style={{ color: "var(--text-secondary)", margin: "1rem 0 2rem" }}>
                  Click "Apply via CollegeMatch" on any matched college to start tracking your application pipeline.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveTab("matches")}
                >
                  View My Matches
                </button>
              </div>
            ) : (
              <>
                {/* Pipeline Summary Strip */}
                <div className={styles.pipelineSummary}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = stats.leadStatusCounts[key] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={key} className={styles.pipelineStep} style={{ borderColor: cfg.color }}>
                        <span className={styles.pipelineIcon}>{cfg.icon}</span>
                        <span className={styles.pipelineCount} style={{ color: cfg.color }}>{count}</span>
                        <span className={styles.pipelineLabel}>{cfg.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.leadsTable}>
                  <div className={styles.tableHead}>
                    <span>College & Branch</span>
                    <span>Status</span>
                    <span>Referred On</span>
                    <span>Last Updated</span>
                    <span>Token</span>
                  </div>
                  {leads.map((lead) => {
                    const cfg = STATUS_CONFIG[lead.status] || { label: lead.status, color: "#6b7280", icon: "?" };
                    const canWithdraw = lead.status === "REFERRED" || lead.status === "APPLIED" || lead.status === "SHORTLISTED";
                    return (
                      <div key={lead.id} className={styles.tableRow}>
                        <div>
                          <div className={styles.leadCollege}>{lead.collegeName}</div>
                          <div className={styles.leadBranch}>
                            📍 {lead.collegeCity}, {lead.collegeState} · {lead.branchCode}
                          </div>
                        </div>
                        <div className={styles.leadActions}>
                          <span
                            className={styles.statusBadge}
                            style={{
                              color: cfg.color,
                              background: `${cfg.color}15`,
                              borderColor: `${cfg.color}30`,
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                          {canWithdraw && (
                            <button
                              className={styles.withdrawBtn}
                              onClick={() => handleWithdraw(lead.id)}
                              disabled={actionLoading[lead.id]}
                            >
                              {actionLoading[lead.id] ? "..." : "Withdraw"}
                            </button>
                          )}
                        </div>
                        <div className={styles.tableDate}>
                          {new Date(lead.referredAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </div>
                        <div className={styles.tableDate}>
                          {new Date(lead.statusUpdatedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </div>
                        <div>
                          <code className={styles.tokenCode}>
                            {lead.trackingToken.slice(0, 12)}…
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`${styles.toast} ${
            toastMessage.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
