"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./commissions.module.css";

interface CommissionLead {
  id: string;
  trackingToken: string;
  branchCode: string;
  status: string;
  student: { id: string; name: string; email: string };
  college: { id: string; name: string; city: string; state: string };
}

interface Commission {
  id: string;
  amountDue: number;
  status: string;
  invoiceDate: string | null;
  paymentDate: string | null;
  createdAt: string;
  lead: CommissionLead;
}

interface Summary {
  totalRevenue: number;
  pendingRevenue: number;
  totalTransactions: number;
  statusBreakdown: Record<string, { count: number; amount: number }>;
  recentTransactions: {
    id: string;
    amountDue: number;
    status: string;
    createdAt: string;
    studentName: string;
    collegeName: string;
  }[];
  topColleges: {
    id: string;
    name: string;
    totalAmount: number;
    leadCount: number;
  }[];
}

const COMMISSION_STATUSES = [
  { value: "PENDING", label: "Pending", color: "#f59e0b", icon: "⏳" },
  { value: "INVOICED", label: "Invoiced", color: "#06b6d4", icon: "📄" },
  { value: "PAID", label: "Paid", color: "#10b981", icon: "✅" },
  { value: "CANCELLED", label: "Cancelled", color: "#ef4444", icon: "❌" },
];

export default function SuperadminCommissionsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [pagination, setPagination] = useState({
    page: 1, limit: 15, totalCount: 0, totalPages: 0,
  });
  const [commSummary, setCommSummary] = useState<Record<string, { count: number; amount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch summary data
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/commissions/summary");
        const json = await res.json();
        if (res.ok) setSummary(json);
      } catch (err) {
        console.error("Failed to load commission summary:", err);
      }
    }
    loadSummary();
  }, []);

  const fetchCommissions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        status: statusFilter,
      });
      const res = await fetch(`/api/commissions?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCommissions(json.transactions);
      setPagination(json.pagination);
      setCommSummary(json.summary);
    } catch (err: any) {
      console.error("Failed to fetch commissions:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCommissions(1);
  }, [fetchCommissions]);

  function showToast(text: string, type: "success" | "error") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleStatusChange(commissionId: string, newStatus: string) {
    setUpdatingId(commissionId);
    try {
      const res = await fetch("/api/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast(`Commission updated to ${newStatus}`, "success");
      await fetchCommissions(pagination.page);
      // Refresh summary
      const sumRes = await fetch("/api/commissions/summary");
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (err: any) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  const formatCurrency = (amt: number) => {
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)}L`;
    if (amt >= 1000) return `₹${(amt / 1000).toFixed(1)}K`;
    return `₹${amt.toLocaleString("en-IN")}`;
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>💰 Commission Billing</h1>
          <p className={styles.pageSubtitle}>
            Track revenue, manage invoices, and monitor payment status across all partner colleges
          </p>
        </div>
      </div>

      {/* Revenue KPI Cards */}
      {summary && (
        <div className={styles.kpiRow}>
          <div className={`${styles.kpiCard} ${styles.kpiRevenue}`}>
            <div className={styles.kpiIconWrap}>✅</div>
            <div className={styles.kpiValue}>{formatCurrency(summary.totalRevenue)}</div>
            <div className={styles.kpiLabel}>Total Revenue (Paid)</div>
            <div className={styles.kpiSub}>
              {summary.statusBreakdown.PAID?.count || 0} transactions
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiPending}`}>
            <div className={styles.kpiIconWrap}>⏳</div>
            <div className={styles.kpiValue}>{formatCurrency(summary.pendingRevenue)}</div>
            <div className={styles.kpiLabel}>Pending Revenue</div>
            <div className={styles.kpiSub}>
              {(summary.statusBreakdown.PENDING?.count || 0) + (summary.statusBreakdown.INVOICED?.count || 0)} pending + invoiced
            </div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
            <div className={styles.kpiIconWrap}>📊</div>
            <div className={styles.kpiValue}>{summary.totalTransactions}</div>
            <div className={styles.kpiLabel}>Total Transactions</div>
            <div className={styles.kpiSub}>Across all colleges</div>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiCancelled}`}>
            <div className={styles.kpiIconWrap}>❌</div>
            <div className={styles.kpiValue}>
              {formatCurrency(summary.statusBreakdown.CANCELLED?.amount || 0)}
            </div>
            <div className={styles.kpiLabel}>Cancelled</div>
            <div className={styles.kpiSub}>
              {summary.statusBreakdown.CANCELLED?.count || 0} transactions
            </div>
          </div>
        </div>
      )}

      {/* Top Colleges & Recent Transactions Side-by-Side */}
      {summary && (
        <div className={styles.insightsRow}>
          {/* Top Colleges */}
          <div className={styles.insightCard}>
            <h3 className={styles.insightTitle}>🏆 Top Colleges by Commission</h3>
            {summary.topColleges.length === 0 ? (
              <p className={styles.insightEmpty}>No commission data yet</p>
            ) : (
              <div className={styles.rankList}>
                {summary.topColleges.map((col, i) => (
                  <div key={col.id} className={styles.rankItem}>
                    <span className={styles.rankNum}>#{i + 1}</span>
                    <div className={styles.rankInfo}>
                      <div className={styles.rankName}>{col.name}</div>
                      <div className={styles.rankMeta}>{col.leadCount} leads</div>
                    </div>
                    <span className={styles.rankAmount}>{formatCurrency(col.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className={styles.insightCard}>
            <h3 className={styles.insightTitle}>🕐 Recent Transactions</h3>
            {summary.recentTransactions.length === 0 ? (
              <p className={styles.insightEmpty}>No recent transactions</p>
            ) : (
              <div className={styles.recentList}>
                {summary.recentTransactions.map((t) => {
                  const statusCfg = COMMISSION_STATUSES.find((s) => s.value === t.status) || {
                    label: t.status, color: "#94a3b8", icon: "?",
                  };
                  return (
                    <div key={t.id} className={styles.recentItem}>
                      <div>
                        <div className={styles.recentStudent}>{t.studentName}</div>
                        <div className={styles.recentCollege}>{t.collegeName}</div>
                      </div>
                      <div className={styles.recentRight}>
                        <span className={styles.recentAmount}>{formatCurrency(t.amountDue)}</span>
                        <span
                          className={styles.recentStatus}
                          style={{ color: statusCfg.color }}
                        >
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Filter Bar */}
      <div className={styles.filterBar}>
        <h2 className={styles.sectionTitle}>Commission Transactions</h2>
        <div className={styles.statusTabs}>
          <button
            className={`${styles.statusTab} ${statusFilter === "ALL" ? styles.statusTabActive : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </button>
          {COMMISSION_STATUSES.map((st) => (
            <button
              key={st.value}
              className={`${styles.statusTab} ${statusFilter === st.value ? styles.statusTabActive : ""}`}
              style={statusFilter === st.value ? { color: st.color, borderColor: st.color } : {}}
              onClick={() => setStatusFilter(st.value)}
            >
              {st.icon} {st.label} ({commSummary[st.value]?.count || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Commission Table */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading commissions...</p>
        </div>
      ) : commissions.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💸</div>
          <h3>No commission transactions found</h3>
          <p>Commission records are created when leads reach ENROLLED status.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <div className={styles.tableHead}>
              <span>Student & College</span>
              <span>Branch</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            {commissions.map((comm) => {
              const statusCfg = COMMISSION_STATUSES.find((s) => s.value === comm.status) || {
                label: comm.status, color: "#94a3b8", icon: "?",
              };
              return (
                <div key={comm.id} className={styles.tableRow}>
                  <div className={styles.cellInfo}>
                    <div className={styles.cellStudent}>{comm.lead.student.name}</div>
                    <div className={styles.cellCollege}>
                      {comm.lead.college.name} · {comm.lead.college.city}
                    </div>
                  </div>

                  <div className={styles.cellBranch}>
                    <span className={styles.branchPill}>{comm.lead.branchCode}</span>
                  </div>

                  <div className={styles.cellAmount}>
                    {formatCurrency(comm.amountDue)}
                  </div>

                  <div>
                    <span
                      className={styles.statusBadge}
                      style={{
                        color: statusCfg.color,
                        background: `${statusCfg.color}15`,
                        borderColor: `${statusCfg.color}30`,
                      }}
                    >
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>

                  <div className={styles.cellDate}>
                    {new Date(comm.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "2-digit",
                    })}
                    {comm.invoiceDate && (
                      <div className={styles.subDate}>
                        📄 {new Date(comm.invoiceDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    )}
                    {comm.paymentDate && (
                      <div className={styles.subDate}>
                        💳 {new Date(comm.paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    )}
                  </div>

                  <div>
                    <select
                      value={comm.status}
                      onChange={(e) => handleStatusChange(comm.id, e.target.value)}
                      disabled={updatingId === comm.id}
                      className={styles.statusSelect}
                    >
                      {COMMISSION_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          → {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className={styles.paginationBar}>
            <span className={styles.pageInfo}>
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
              {pagination.totalCount}
            </span>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageBtn}
                disabled={pagination.page <= 1}
                onClick={() => fetchCommissions(pagination.page - 1)}
              >
                ← Prev
              </button>
              <button
                className={styles.pageBtn}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchCommissions(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
