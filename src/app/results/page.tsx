import { prisma } from "@/lib/db";
import Link from "next/link";
import styles from "./results.module.css";

interface ResultsProps {
  searchParams: Promise<{ student_id?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsProps) {
  const params = await searchParams;
  const studentId = params.student_id;

  if (!studentId) {
    return (
      <div className={styles.errorContainer}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>No recommendations found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            It looks like you haven't filled out the preference wizard yet.
          </p>
          <Link href="/wizard" className="btn btn-primary">
            Start Preference Wizard
          </Link>
        </div>
      </div>
    );
  }

  // 1. Fetch Student from database
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      locations: true,
      priorities: true,
    },
  });

  if (!student) {
    return (
      <div className={styles.errorContainer}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>Student record not found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            The student ID provided is invalid or has been removed.
          </p>
          <Link href="/wizard" className="btn btn-primary">
            Restart Wizard
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch recommendations generated for this student
  const dbRecommendations = await prisma.recommendation.findMany({
    where: { studentId },
    orderBy: { rankPosition: "asc" },
    include: {
      college: {
        include: {
          branches: true,
        },
      },
    },
  });

  return (
    <div className={styles.wrapper}>
      {/* Navbar */}
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <Link href="/" className={styles.logo}>
            CollegeMatch
          </Link>
          <div className={styles.studentBadge}>
            👤 {student.name}
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <section className={styles.resultsHeader}>
          <h1 className={styles.title}>Your Best Fit B.Tech Colleges</h1>
          <p className={styles.subtitle}>
            Based on your priorities, academic profile, and a 4-year budget of{" "}
            <strong>
              {student.budgetLimit ? `₹${(Number(student.budgetLimit) / 100000).toFixed(1)} Lakh` : "No Constraint"}
            </strong>.
          </p>
        </section>

        {dbRecommendations.length === 0 ? (
          <div style={{ margin: "2rem auto", maxWidth: "600px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <h3 style={{ color: "#0F2D52" }}>No matches satisfy your strict filters</h3>
            <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
              Try loosening your location constraints or increasing your budget limit in the wizard.
            </p>
            <Link href="/wizard" className="btn btn-primary">
              Adjust Preferences
            </Link>
          </div>
        ) : (
          <div>
            <div className={styles.resultsList}>
              {dbRecommendations.map((rec) => {
                const college = rec.college;
                const branch = college.branches.find((b) => b.branchCode === rec.branchCode);
                
                if (!branch) return null;

                // Parse reasons
                let reasonsList: string[] = [];
                try {
                  reasonsList = JSON.parse(rec.reasons as string);
                } catch (e) {
                  reasonsList = [String(rec.reasons)];
                }

                // Calculate admission competitiveness on the fly
                const jeeGap = student.jeePercentile && branch.minJeePercentileCutoff
                  ? Number(student.jeePercentile) - Number(branch.minJeePercentileCutoff)
                  : null;
                const c12Gap = student.class12Percentage && branch.minClass12Cutoff
                  ? Number(student.class12Percentage) - Number(branch.minClass12Cutoff)
                  : null;
                
                const gap = jeeGap !== null && c12Gap !== null
                  ? Math.max(jeeGap, c12Gap)
                  : (jeeGap !== null ? jeeGap : c12Gap);

                let category = "Target";
                let badgeClass = styles.badgeTarget;
                if (gap !== null) {
                  if (gap >= 5.0) {
                    category = "Safe";
                    badgeClass = styles.badgeSafe;
                  } else if (gap < -5.0) {
                    category = "Unlikely";
                    badgeClass = styles.badgeUnlikely;
                  } else if (gap < 0) {
                    category = "Reach";
                    badgeClass = styles.badgeReach;
                  }
                }

                const total4YrCost = (branch.tuitionFeeAnnual + branch.hostelFeeAnnual) * 4;

                // Dynamic Redirect Link to track leads
                const applyRedirectUrl = `/api/leads/apply?student_id=${student.id}&college_id=${college.id}&branch_code=${branch.branchCode}`;

                return (
                  <div key={rec.id} className={styles.collegeCard}>
                    {/* Card Header */}
                    <div className={styles.cardHeader}>
                      <div className={styles.collegeMeta}>
                        <span className={styles.rankBadge}>#{rec.rankPosition}</span>
                        <div>
                          <h2 className={styles.collegeName}>{college.name}</h2>
                          <p className={styles.collegeLocation}>📍 {college.city}, {college.state}</p>
                        </div>
                      </div>
                      <div className={styles.scoreWrapper}>
                        <div className={styles.scoreLabel}>Match Score</div>
                        <div className={styles.scoreVal}>{Number(rec.matchScore).toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Program Title */}
                    <div className={styles.branchBox}>
                      <span className={styles.branchBadge}>{branch.branchCode}</span>
                      <span className={styles.branchTitle}>{branch.branchName}</span>
                    </div>

                    {/* Main Grid Content */}
                    <div className={styles.cardGrid}>
                      {/* Key Placement Stats */}
                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>Placements</h4>
                        <div className={styles.statRow}>
                          <span>Average Package:</span>
                          <strong>₹{(Number(branch.avgSalary) / 100000).toFixed(2)} LPA</strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Median Package:</span>
                          <strong>₹{(Number(branch.medianSalary) / 100000).toFixed(2)} LPA</strong>
                        </div>
                        {branch.highestSalary && (
                          <div className={styles.statRow}>
                            <span>Highest Package:</span>
                            <strong>₹{(Number(branch.highestSalary) / 100000).toFixed(2)} LPA</strong>
                          </div>
                        )}
                      </div>

                      {/* Fees Details */}
                      <div className={styles.gridSection}>
                        <h4 className={styles.sectionTitle}>4-Year Financials</h4>
                        <div className={styles.statRow}>
                          <span>Annual Tuition:</span>
                          <strong>₹{(Number(branch.tuitionFeeAnnual) / 100000).toFixed(2)} L</strong>
                        </div>
                        <div className={styles.statRow}>
                          <span>Annual Hostel:</span>
                          <strong>₹{(Number(branch.hostelFeeAnnual) / 100000).toFixed(2)} L</strong>
                        </div>
                        <div className={styles.totalRow}>
                          <span>Est. Total Cost:</span>
                          <strong>₹{(total4YrCost / 100000).toFixed(2)} Lakh</strong>
                        </div>
                      </div>

                      {/* Admission Likelihood */}
                      <div className={styles.gridSection} style={{ borderRight: "none" }}>
                        <h4 className={styles.sectionTitle}>Admission Likelihood</h4>
                        <div className={styles.likelihoodWrapper}>
                          <span className={`${styles.likelihoodBadge} ${badgeClass}`}>
                            {category} Fit
                          </span>
                        </div>
                        <p className={styles.cutoffSubtext}>
                          Cutoffs: JEE Percentile {branch.minJeePercentileCutoff ? `~${branch.minJeePercentileCutoff}%` : "N/A"} | 
                          Boards {branch.minClass12Cutoff ? `~${branch.minClass12Cutoff}%` : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Reasons & Action */}
                    <div className={styles.cardFooter}>
                      <div className={styles.reasonsList}>
                        {reasonsList.map((reason, idx) => (
                          <div key={idx} className={styles.reasonItem}>
                            ✨ {reason}
                          </div>
                        ))}
                      </div>
                      <div className={styles.actionBtn}>
                        <a 
                          href={applyRedirectUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary"
                          style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}
                        >
                          Apply Official Link ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
