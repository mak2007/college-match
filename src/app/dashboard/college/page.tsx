"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./college.module.css";

interface College {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brochureUrl: string | null;
  officialApplyUrl: string;
  isPartner: boolean;
  commissionRate: number;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  customAttributes: Record<string, any>;
  createdAt: string;
}

interface Branch {
  id: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  seatCapacity: number;
  avgSalary: number | null;
  highestSalary: number | null;
  minJeePercentileCutoff: number | null;
  minClass12Cutoff: number | null;
  branchStrengthScore: number;
  metadata: Record<string, any>;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  jeePercentile: number | null;
  class12Percentage: number | null;
}

interface Lead {
  id: string;
  status: string;
  branchCode: string;
  trackingToken: string;
  referredAt: string;
  statusUpdatedAt: string;
  student: Student;
  commission: {
    id: string;
    amountDue: number;
    status: string;
  } | null;
}

interface Stats {
  totalLeads: number;
  enrolledCount: number;
  totalCommissionsDue: number;
  leadStatusCounts: Record<string, number>;
}

interface CollegeDataResponse {
  college: College;
  branches: Branch[];
  stats: Stats;
  leads: Lead[];
}

interface CollegeSimple {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  isPartner: boolean;
}

const STATUS_OPTIONS = [
  { value: "REFERRED", label: "Referred", color: "#6366f1", icon: "🔗" },
  { value: "APPLIED", label: "Applied", color: "#06b6d4", icon: "📝" },
  { value: "SHORTLISTED", label: "Shortlisted", color: "#f59e0b", icon: "⭐" },
  { value: "ENROLLED", label: "Enrolled", color: "#10b981", icon: "🎓" },
  { value: "REJECTED", label: "Rejected", color: "#ef4444", icon: "❌" },
  { value: "LAPSED", label: "Lapsed", color: "#6b7280", icon: "⏰" },
];

export default function CollegeAdminDashboard() {
  const [collegesList, setCollegesList] = useState<CollegeSimple[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [data, setData] = useState<CollegeDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"leads" | "branches" | "profile">("leads");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Load college selection list
  useEffect(() => {
    async function fetchColleges() {
      try {
        const res = await fetch("/api/college/list");
        if (res.ok) {
          const list = await res.json();
          setCollegesList(list);
        }
      } catch (err) {
        console.error("Failed to load colleges list:", err);
      }
    }
    fetchColleges();
  }, []);

  async function loadDashboard(collegeId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/college/${collegeId}`);
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

  function handleCollegeSelect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCollegeId) return;
    loadDashboard(selectedCollegeId);
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    setUpdatingLeadId(leadId);
    setStatusMessage("");
    try {
      const res = await fetch("/api/college/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");

      setStatusMessage("Status updated successfully!");
      // Reload details to sync dynamic billing calculations and pipeline metrics
      if (data) {
        await loadDashboard(data.college.id);
      }
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      alert(err.message || "Error updating status");
    } finally {
      setUpdatingLeadId(null);
    }
  }

  // Filter leads based on query & status filter dropdown
  const filteredLeads = data?.leads.filter((lead) => {
    const matchesSearch =
      lead.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.student.phone.includes(searchQuery);
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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
          <div className={`${styles.gateCard} glass-card`}>
            <div className={styles.gateIcon}>🏫</div>
            <h1 className={styles.gateTitle}>College Admin Portal</h1>
            <p className={styles.gateSubtitle}>
              Select your college profile from the partner list below to manage student referrals, update enrollment statuses, and track revenue invoices.
            </p>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <form onSubmit={handleCollegeSelect} className={styles.gateForm}>
              <select
                value={selectedCollegeId}
                onChange={(e) => setSelectedCollegeId(e.target.value)}
                required
                className={styles.gateSelect}
                id="college-select-dropdown"
              >
                <option value="">-- Choose a College Profile --</option>
                {collegesList.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.city}, {col.state}) {col.isPartner ? "★ Partner" : ""}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary" disabled={loading || !selectedCollegeId}>
                {loading ? "Loading Dashboard..." : "Access Admin Portal →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const { college, branches, stats } = data;

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <div className="flex-center" style={{ gap: "0.75rem" }}>
            <Link href="/" className={styles.logo}>CollegeMatch</Link>
            <span className={styles.collegeTag}>Portal</span>
          </div>
          <div className="flex-center" style={{ gap: "1.25rem" }}>
            <span className={styles.collegeNameHeader}>🏫 {college.name}</span>
            <button
              onClick={() => {
                setData(null);
                setSelectedCollegeId("");
              }}
              className={styles.exitBtn}
            >
              Exit Portal
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: "2rem 1.5rem 4rem" }}>
        
        {/* welcome details */}
        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeAvatar}>
            {college.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.welcomeTitle}>{college.name}</h1>
            <p className={styles.welcomeSub}>
              📍 {college.city}, {college.state} · {college.isPartner ? "Exclusive Partner College" : "Regular Member"}
            </p>
          </div>
          <div className={styles.welcomeActions}>
            <a href={college.officialApplyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Official Page ↗
            </a>
          </div>
        </div>

        {/* KPI stats metrics row */}
        <div className={styles.kpiRow}>
          <div className={`${styles.kpiCard} glass-card`}>
            <div className={styles.kpiIcon}>👥</div>
            <div className={styles.kpiValue}>{stats.totalLeads}</div>
            <div className={styles.kpiLabel}>Total Referrals</div>
            <div className={styles.kpiSub}>Students matching cutoffs</div>
          </div>
          <div className={`${styles.kpiCard} glass-card`}>
            <div className={styles.kpiIcon}>🎓</div>
            <div className={styles.kpiValue} style={{ color: "#10b981" }}>{stats.enrolledCount}</div>
            <div className={styles.kpiLabel}>Enrolled Conversions</div>
            <div className={styles.kpiSub}>Successful admissions</div>
          </div>
          <div className={`${styles.kpiCard} glass-card`}>
            <div className={styles.kpiIcon}>💰</div>
            <div className={styles.kpiValue} style={{ color: "#818cf8" }}>
              ₹{(stats.totalCommissionsDue / 100000).toFixed(2)}L
            </div>
            <div className={styles.kpiLabel}>Accrued Commissions</div>
            <div className={styles.kpiSub}>Based on ₹{college.commissionRate.toLocaleString("en-IN")}/seat</div>
          </div>
          <div className={`${styles.kpiCard} glass-card`}>
            <div className={styles.kpiIcon}>🏛️</div>
            <div className={styles.kpiValue}>{branches.length}</div>
            <div className={styles.kpiLabel}>Active Branches</div>
            <div className={styles.kpiSub}>B.Tech departments</div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === "leads" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("leads")}
          >
            📋 Referrals Pipeline ({stats.totalLeads})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "branches" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("branches")}
          >
            ⚙️ Seat configurations & Cutoffs
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            🏢 College Profile Details
          </button>
        </div>

        {/* TAB 1: Referrals Pipeline */}
        {activeTab === "leads" && (
          <div className={styles.tabContent}>
            
            {/* Search & filters controls */}
            <div className={styles.filterBar}>
              <input
                type="text"
                placeholder="🔍 Search student name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="ALL">All Statuses</option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              {statusMessage && <span className={styles.statusToast}>✓ {statusMessage}</span>}
            </div>

            {filteredLeads.length === 0 ? (
              <div className="glass-card text-center" style={{ padding: "4rem 2rem" }}>
                <h3>No referrals found</h3>
                <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0" }}>
                  Adjust your search query or status filter criteria.
                </p>
              </div>
            ) : (
              <div className={styles.leadsGrid}>
                {filteredLeads.map((lead) => {
                  const currStatus = STATUS_OPTIONS.find((s) => s.value === lead.status) || {
                    label: lead.status,
                    color: "#94a3b8",
                    icon: "❓",
                  };
                  return (
                    <article key={lead.id} className={`${styles.leadCard} glass-card`}>
                      <div className={styles.leadHeader}>
                        <div>
                          <h3 className={styles.leadStudentName}>{lead.student.name}</h3>
                          <span
                            className={styles.statusBadge}
                            style={{
                              color: currStatus.color,
                              background: `${currStatus.color}15`,
                              borderColor: `${currStatus.color}30`,
                            }}
                          >
                            {currStatus.icon} {currStatus.label}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className={styles.referredDateLabel}>Referred On</span>
                          <div className={styles.referredDate}>
                            {new Date(lead.referredAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className={styles.leadInfoSection}>
                        <div className={styles.leadDetailCol}>
                          <span>JEE Percentile</span>
                          <strong>
                            {lead.student.jeePercentile != null
                              ? `${lead.student.jeePercentile}%ile`
                              : "N/A"}
                          </strong>
                        </div>
                        <div className={styles.leadDetailCol}>
                          <span>Class 12 Marks</span>
                          <strong>
                            {lead.student.class12Percentage != null
                              ? `${lead.student.class12Percentage}%`
                              : "N/A"}
                          </strong>
                        </div>
                        <div className={styles.leadDetailCol}>
                          <span>Target Branch</span>
                          <strong className={styles.leadBranchPill}>{lead.branchCode}</strong>
                        </div>
                      </div>

                      <div className={styles.leadContactBlock}>
                        <div>📧 {lead.student.email}</div>
                        <div>📞 {lead.student.phone}</div>
                      </div>

                      <div className={styles.leadActionFooter}>
                        <div className={styles.tokenContainer}>
                          <span>Token:</span>
                          <code>{lead.trackingToken.slice(0, 10)}...</code>
                        </div>
                        <div className={styles.selectWrapper}>
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            disabled={updatingLeadId === lead.id}
                            className={styles.statusChangeSelect}
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st.value} value={st.value}>
                                Move to {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Branch Configurations */}
        {activeTab === "branches" && (
          <div className={styles.tabContent}>
            <div className={styles.branchesList}>
              {branches.map((b) => (
                <div key={b.id} className={`${styles.branchCard} glass-card`}>
                  <div className={styles.branchHeader}>
                    <div>
                      <span className={styles.branchCodeBig}>{b.branchCode}</span>
                      <h3 className={styles.branchNameTitle}>{b.branchName}</h3>
                    </div>
                    <div className={styles.branchStrengthWrap}>
                      <span>Strength Score</span>
                      <strong>{b.branchStrengthScore}/10</strong>
                    </div>
                  </div>

                  <div className={styles.branchInfoGrid}>
                    <div className={styles.branchInfoCard}>
                      <span>Annual Tuition Fee</span>
                      <strong>₹{(b.tuitionFeeAnnual / 100000).toFixed(2)} Lakh</strong>
                    </div>
                    <div className={styles.branchInfoCard}>
                      <span>Annual Hostel Fee</span>
                      <strong>₹{(b.hostelFeeAnnual / 100000).toFixed(2)} Lakh</strong>
                    </div>
                    <div className={styles.branchInfoCard}>
                      <span>Seat Capacity</span>
                      <strong>{b.seatCapacity} seats</strong>
                    </div>
                    <div className={styles.branchInfoCard}>
                      <span>Avg Package</span>
                      <strong>
                        {b.avgSalary != null ? `₹${(b.avgSalary / 100000).toFixed(1)} LPA` : "N/A"}
                      </strong>
                    </div>
                    <div className={styles.branchInfoCard}>
                      <span>Min JEE Cutoff</span>
                      <strong>{b.minJeePercentileCutoff ?? "Open"} %ile</strong>
                    </div>
                    <div className={styles.branchInfoCard}>
                      <span>Min Class 12 Marks</span>
                      <strong>{b.minClass12Cutoff ?? "Open"}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: College Profile details */}
        {activeTab === "profile" && (
          <div className={styles.tabContent}>
            <div className={styles.profileDetailsGrid}>
              
              {/* Ratings Card */}
              <div className={`${styles.profileInfoCard} glass-card`}>
                <h3>📈 College Performance Scores</h3>
                <div className={styles.ratingsList}>
                  <div className={styles.ratingRow}>
                    <span>Placement Success</span>
                    <div className={styles.ratingBarContainer}>
                      <div className={styles.ratingBar} style={{ width: `${college.placementScore * 10}%` }}></div>
                      <span>{college.placementScore}/10</span>
                    </div>
                  </div>
                  <div className={styles.ratingRow}>
                    <span>College Life & Campus</span>
                    <div className={styles.ratingBarContainer}>
                      <div className={styles.ratingBar} style={{ width: `${college.collegeLifeScore * 10}%`, background: "#a855f7" }}></div>
                      <span>{college.collegeLifeScore}/10</span>
                    </div>
                  </div>
                  <div className={styles.ratingRow}>
                    <span>Curriculum & Faculty</span>
                    <div className={styles.ratingBarContainer}>
                      <div className={styles.ratingBar} style={{ width: `${college.curriculumScore * 10}%`, background: "#06b6d4" }}></div>
                      <span>{college.curriculumScore}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Metadata Info Card */}
              <div className={`${styles.profileInfoCard} glass-card`}>
                <h3>🏢 Portal Configurations</h3>
                <div className={styles.configList}>
                  <div className={styles.configRow}>
                    <span>Partner Status</span>
                    <strong>{college.isPartner ? "Verified Exclusive Partner ✓" : "Regular College member"}</strong>
                  </div>
                  <div className={styles.configRow}>
                    <span>Referral Commission Fee</span>
                    <strong>₹{college.commissionRate.toLocaleString("en-IN")} per Enrolled lead</strong>
                  </div>
                  <div className={styles.configRow}>
                    <span>Official Application Link</span>
                    <a href={college.officialApplyUrl} target="_blank" rel="noopener noreferrer" className={styles.profileLink}>
                      {college.officialApplyUrl}
                    </a>
                  </div>
                  {college.brochureUrl && (
                    <div className={styles.configRow}>
                      <span>Brochure Link</span>
                      <a href={college.brochureUrl} target="_blank" rel="noopener noreferrer" className={styles.profileLink}>
                        Download Brochure PDF ⬇
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom attributes card */}
              <div className={`${styles.profileInfoCard} glass-card`}>
                <h3>✨ Custom Attributes & Ratings</h3>
                {Object.keys(college.customAttributes).length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No custom attributes set for this college.</p>
                ) : (
                  <div className={styles.attributesGrid}>
                    {Object.entries(college.customAttributes).map(([key, val]) => (
                      <div key={key} className={styles.attributeItem}>
                        <span>{key.toUpperCase().replace("_", " ")}</span>
                        <strong>{val}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
