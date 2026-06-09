import { prisma } from "@/lib/db";
import Link from "next/link";
import styles from "./super.module.css";

export default async function SuperadminDashboard() {
  // Auth is verified by the parent layout.tsx — no need to re-check here.

  // 1. Fetch Aggregated Statistics
  const totalLeads = await prisma.lead.count();
  const partnerCollegesCount = await prisma.college.count({ where: { isPartner: true } });
  
  // Sum of commission transactions
  const transactions = await prisma.commissionTransaction.findMany({});
  const totalCommission = transactions.reduce((acc, t) => acc + Number(t.amountDue), 0);
  
  const pendingCommission = transactions
    .filter((t) => t.status === "PENDING" || t.status === "INVOICED")
    .reduce((acc, t) => acc + Number(t.amountDue), 0);

  const paidCommission = transactions
    .filter((t) => t.status === "PAID")
    .reduce((acc, t) => acc + Number(t.amountDue), 0);

  // 3. Fetch Recent Leads Conversion Funnel
  const recentLeads = await prisma.lead.findMany({
    orderBy: { referredAt: "desc" },
    take: 10,
    include: {
      student: true,
      college: true,
      commissionTransaction: true,
    },
  });

  // 4. Fetch Colleges Leads Summary Table
  const partnerColleges = await prisma.college.findMany({
    include: {
      leads: {
        include: {
          commissionTransaction: true,
        },
      },
    },
  });

  const collegesList = partnerColleges.map((c) => {
    const totalCollLeads = c.leads.length;
    const enrollments = c.leads.filter((l) => l.status === "ENROLLED");
    const totalRev = enrollments.reduce((acc, l) => {
      return acc + (l.commissionTransaction ? Number(l.commissionTransaction.amountDue) : 0);
    }, 0);

    return {
      id: c.id,
      name: c.name,
      city: c.city,
      isPartner: c.isPartner,
      commissionRate: Number(c.commissionRate),
      leadsCount: totalCollLeads,
      enrollmentsCount: enrollments.length,
      revenueEarned: totalRev,
    };
  });

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        {/* Statistics Cards */}
        <section className={styles.statsGrid}>
          <div className="glass-card">
            <div className={styles.statLabel}>Total Referrals</div>
            <div className={styles.statVal}>{totalLeads}</div>
          </div>
          <div className="glass-card">
            <div className={styles.statLabel}>Partner Colleges</div>
            <div className={styles.statVal}>{partnerCollegesCount}</div>
          </div>
          <div className="glass-card">
            <div className={styles.statLabel}>Total Commission Pipeline</div>
            <div className={styles.statVal} style={{ color: "var(--primary-color)" }}>
              ₹{(totalCommission / 100000).toFixed(2)} L
            </div>
          </div>
          <div className="glass-card">
            <div className={styles.statLabel}>Settled Commissions</div>
            <div className={styles.statVal} style={{ color: "var(--color-success)" }}>
              ₹{(paidCommission / 100000).toFixed(2)} L
            </div>
          </div>
        </section>

        {/* main Grid layouts */}
        <div className={styles.contentGrid}>
          {/* Colleges list */}
          <section className="glass-card" style={{ gridColumn: "span 2" }}>
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
          <section className="glass-card">
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
        </div>
      </main>
    </div>
  );
}
