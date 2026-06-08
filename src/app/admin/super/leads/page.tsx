"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./leads.module.css";

interface LeadStudent {
  id: string;
  name: string;
  email: string;
  phone: string;
  jeePercentile: number | null;
  class12Percentage: number | null;
}

interface LeadCollege {
  id: string;
  name: string;
  city: string;
  state: string;
  commissionRate: number;
}

interface LeadCommission {
  id: string;
  amountDue: number;
  status: string;
  invoiceDate: string | null;
  paymentDate: string | null;
}

interface Lead {
  id: string;
  status: string;
  branchCode: string;
  trackingToken: string;
  referredAt: string;
  statusUpdatedAt: string;
  student: LeadStudent;
  college: LeadCollege;
  commission: LeadCommission | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses", color: "#94a3b8", icon: "📊" },
  { value: "REFERRED", label: "Referred", color: "#6366f1", icon: "🔗" },
  { value: "APPLIED", label: "Applied", color: "#06b6d4", icon: "📝" },
  { value: "SHORTLISTED", label: "Shortlisted", color: "#f59e0b", icon: "⭐" },
  { value: "ENROLLED", label: "Enrolled", color: "#10b981", icon: "🎓" },
  { value: "REJECTED", label: "Rejected", color: "#ef4444", icon: "❌" },
  { value: "LAPSED", label: "Lapsed", color: "#6b7280", icon: "⏰" },
];

const PIPELINE_STATUSES = STATUS_OPTIONS.filter((s) => s.value !== "ALL");

export default function SuperadminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: 15, totalCount: 0, totalPages: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        status: statusFilter,
        search: searchQuery,
      });
      const res = await fetch(`/api/leads/history?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLeads(json.leads);
      setPagination(json.pagination);
      setStatusBreakdown(json.statusBreakdown);
    } catch (err: any) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  function showToast(text: string, type: "success" | "error") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch("/api/college/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      showToast(`Lead status updated to ${newStatus}`, "success");
      await fetchLeads(pagination.page);
    } catch (err: any) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setUpdatingLeadId(null);
    }
  }

  const totalLeads = Object.values(statusBreakdown).reduce((s, c) => s + c, 0);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📋 Leads Pipeline</h1>
          <p className={styles.pageSubtitle}>
            Monitor and manage all student referral leads across partner colleges
          </p>
        </div>
        <div className={styles.totalBadge}>
          <span className={styles.totalCount}>{totalLeads}</span>
          <span className={styles.totalLabel}>Total Leads</span>
        </div>
      </div>

      {/* Pipeline Summary Cards */}
      <div className={styles.pipelineGrid}>
        {PIPELINE_STATUSES.map((st) => {
          const count = statusBreakdown[st.value] || 0;
          return (
            <button
              key={st.value}
              className={`${styles.pipelineCard} ${statusFilter === st.value ? styles.pipelineCardActive : ""}`}
              style={{ borderColor: statusFilter === st.value ? st.color : "rgba(255,255,255,0.06)" }}
              onClick={() => setStatusFilter(statusFilter === st.value ? "ALL" : st.value)}
            >
              <div className={styles.pipelineIcon}>{st.icon}</div>
              <div className={styles.pipelineCount} style={{ color: st.color }}>{count}</div>
              <div className={styles.pipelineLabel}>{st.label}</div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 Search student name, email, college, or token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          id="leads-search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label} {st.value !== "ALL" ? `(${statusBreakdown[st.value] || 0})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h3>No leads found</h3>
          <p>Adjust your search or filter criteria to find referral leads.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <div className={styles.tableHead}>
              <span>Student</span>
              <span>College & Branch</span>
              <span>Status</span>
              <span>Referred</span>
              <span>Commission</span>
              <span>Actions</span>
            </div>

            {leads.map((lead) => {
              const statusCfg = PIPELINE_STATUSES.find((s) => s.value === lead.status) || {
                label: lead.status, color: "#94a3b8", icon: "❓",
              };
              return (
                <div key={lead.id} className={styles.tableRow}>
                  <div className={styles.cellStudent}>
                    <div className={styles.studentName}>{lead.student.name}</div>
                    <div className={styles.studentMeta}>
                      {lead.student.email}
                    </div>
                    <div className={styles.studentMeta}>
                      📞 {lead.student.phone}
                      {lead.student.jeePercentile != null && ` · JEE: ${lead.student.jeePercentile}%ile`}
                    </div>
                  </div>

                  <div className={styles.cellCollege}>
                    <div className={styles.collegeName}>{lead.college.name}</div>
                    <div className={styles.collegeMeta}>
                      📍 {lead.college.city}, {lead.college.state} · <strong>{lead.branchCode}</strong>
                    </div>
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
                    {new Date(lead.referredAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "2-digit",
                    })}
                  </div>

                  <div className={styles.cellCommission}>
                    {lead.commission ? (
                      <>
                        <span className={styles.commissionAmount}>
                          ₹{(lead.commission.amountDue / 1000).toFixed(0)}K
                        </span>
                        <span className={styles.commissionStatus}>{lead.commission.status}</span>
                      </>
                    ) : (
                      <span className={styles.noCommission}>—</span>
                    )}
                  </div>

                  <div>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      disabled={updatingLeadId === lead.id}
                      className={styles.statusSelect}
                    >
                      {PIPELINE_STATUSES.map((st) => (
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
              {pagination.totalCount} leads
            </span>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageBtn}
                disabled={pagination.page <= 1}
                onClick={() => fetchLeads(pagination.page - 1)}
              >
                ← Previous
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`${styles.pageBtn} ${pagination.page === pageNum ? styles.pageBtnActive : ""}`}
                    onClick={() => fetchLeads(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className={styles.pageBtn}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeads(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
