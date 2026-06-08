"use client";

import { useState } from "react";
import styles from "./college.module.css";

interface Student {
  name: string;
  email: string;
  phone: string;
  jeePercentile: number | null;
  class12Percentage: number | null;
}

interface Lead {
  id: string;
  branchCode: string;
  status: string;
  referredAt: string | Date;
  student: Student;
}

interface LeadsTableProps {
  initialLeads: Lead[];
  collegeName: string;
  commissionRate: number;
}

export default function LeadsTable({ initialLeads, collegeName, commissionRate }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Calculate dynamic stats
  const totalLeads = leads.length;
  const enrolledCount = leads.filter((l) => l.status === "ENROLLED").length;
  const totalDue = enrolledCount * commissionRate;

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingId(leadId);
    setMessage("");

    try {
      const res = await fetch("/api/college/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      // Update local state
      setLeads(
        leads.map((l) => (l.id === leadId ? { ...l, status: newStatus.toUpperCase() } : l))
      );
      setMessage("Lead status updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while updating status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case "REFERRED":
        return styles.badgeReferred;
      case "APPLIED":
        return styles.badgeApplied;
      case "SHORTLISTED":
        return styles.badgeShortlisted;
      case "ENROLLED":
        return styles.badgeEnrolled;
      case "REJECTED":
        return styles.badgeRejected;
      case "LAPSED":
        return styles.badgeLapsed;
      default:
        return styles.badgeReferred;
    }
  };

  return (
    <div>
      {/* Dynamic Summary Cards */}
      <section className={styles.statsGrid}>
        <div className="glass-card">
          <div className={styles.statLabel}>Total Referrals</div>
          <div className={styles.statVal}>{totalLeads}</div>
        </div>
        <div className="glass-card">
          <div className={styles.statLabel}>Successful Enrollments</div>
          <div className={styles.statVal} style={{ color: "var(--secondary-color)" }}>
            {enrolledCount}
          </div>
        </div>
        <div className="glass-card">
          <div className={styles.statLabel}>Acrued Commission Invoice</div>
          <div className={styles.statVal} style={{ color: "var(--color-success)" }}>
            ₹{totalDue.toLocaleString("en-IN")}
          </div>
        </div>
      </section>

      {/* Main Table section */}
      <section className="glass-card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 className={styles.sectionTitle}>Admissions Lead Pipeline</h3>
          {message && <span className={styles.toastMessage}>✓ {message}</span>}
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Applied Branch</th>
                <th>Scores (JEE / 12th)</th>
                <th>Contact Info</th>
                <th>Referred Date</th>
                <th>Status Stage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className={updatingId === lead.id ? styles.rowUpdating : ""}>
                  <td style={{ fontWeight: "600" }}>{lead.student.name}</td>
                  <td>
                    <span className={styles.branchCodeBadge}>{lead.branchCode}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      JEE: <strong>{lead.student.jeePercentile ? `${Number(lead.student.jeePercentile)}%` : "N/A"}</strong> <br />
                      12th: <strong>{lead.student.class12Percentage ? `${Number(lead.student.class12Percentage)}%` : "N/A"}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>
                      📞 {lead.student.phone} <br />
                      📧 {lead.student.email}
                    </div>
                  </td>
                  <td>{new Date(lead.referredAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={styles.statusSelect}
                      disabled={updatingId === lead.id}
                    >
                      <option value="REFERRED">Referred</option>
                      <option value="APPLIED">Applied</option>
                      <option value="SHORTLISTED">Shortlisted</option>
                      <option value="ENROLLED">Enrolled</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="LAPSED">Lapsed</option>
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    No referred student leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
