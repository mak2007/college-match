"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./rankings.module.css";

interface CollegeBranch {
  id: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  avgSalary: number | null;
  branchCode: string;
}

interface College {
  id: string;
  name: string;
  state: string;
  city: string;
  logoUrl: string | null;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  isPartner: boolean;
  branches: CollegeBranch[];
}

interface RankingsClientProps {
  initialColleges: College[];
}

export default function RankingsClient({ initialColleges }: RankingsClientProps) {
  const [activeTab, setActiveTab] = useState<"roi" | "overall" | "affordability" | "curriculum" | "opportunities">("roi");

  // Calculate sorted list based on active methodology
  const rankedColleges = useMemo(() => {
    const list = initialColleges.map((college) => {
      // Pick representative branch details (CSE or first)
      const repBranch = college.branches.find((b) => b.branchCode === "CSE") || college.branches[0];
      const tuition = repBranch ? repBranch.tuitionFeeAnnual : 0;
      const hostel = repBranch ? repBranch.hostelFeeAnnual : 0;
      const salary = repBranch ? repBranch.avgSalary || 0 : 0;

      // 1. Overall Score calculation
      const overallScore = (college.placementScore * 0.4 + college.collegeLifeScore * 0.3 + college.curriculumScore * 0.3) * 10;

      // 2. ROI Ratio calculation: Salary / Tuition
      const roiRatio = tuition > 0 ? salary / tuition : 0;

      // 3. Total Cost
      const totalCost = tuition + hostel;

      return {
        ...college,
        repBranchCode: repBranch ? repBranch.branchCode : "N/A",
        tuition,
        salary,
        totalCost,
        overallScore,
        roiRatio,
      };
    });

    // Sort accordingly
    return list.sort((a, b) => {
      if (activeTab === "roi") return b.roiRatio - a.roiRatio;
      if (activeTab === "overall") return b.overallScore - a.overallScore;
      if (activeTab === "affordability") return a.totalCost - b.totalCost; // Ascending: lowest fee first
      if (activeTab === "curriculum") return b.curriculumScore - a.curriculumScore;
      if (activeTab === "opportunities") return b.placementScore - a.placementScore;
      return 0;
    });
  }, [initialColleges, activeTab]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>Engineering College Rankings 2026</h2>
        <p>Explore & compare top B.Tech colleges in India by different methodologies</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "roi" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("roi")}
        >
          ROI Rankings <span className={styles.flagshipBadge}>Flagship</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "overall" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("overall")}
        >
          Overall Rankings
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "affordability" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("affordability")}
        >
          Affordability Rankings
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "curriculum" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("curriculum")}
        >
          Curriculum & Opportunities
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "opportunities" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("opportunities")}
        >
          Placement Rankings
        </button>
      </div>

      {/* Cards Grid */}
      <div key={activeTab} className={`${styles.cardsGrid} ${styles.fadeContainer}`}>
        {rankedColleges.map((college, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;

          let metricLabel = "";
          let metricValue = "";

          if (activeTab === "roi") {
            metricLabel = "ROI Ratio / Avg Salary";
            metricValue = `${college.roiRatio.toFixed(1)}x (₹${(college.salary / 100000).toFixed(1)}L LPA)`;
          } else if (activeTab === "overall") {
            metricLabel = "Overall Fit Score";
            metricValue = `${college.overallScore.toFixed(0)}%`;
          } else if (activeTab === "affordability") {
            metricLabel = "Fees (Tuition + Hostel)";
            metricValue = `₹${(college.totalCost / 100000).toFixed(2)} Lakhs/yr`;
          } else if (activeTab === "curriculum") {
            metricLabel = "Curriculum Strength";
            metricValue = `${college.curriculumScore}/10 Score`;
          } else if (activeTab === "opportunities") {
            metricLabel = "Placement Strength";
            metricValue = `${college.placementScore}/10 Score`;
          }

          return (
            <div key={college.id} className={styles.rankingCard}>
              <div className={styles.cardTop}>
                {/* Rank Circular Badge */}
                <div className={`${styles.rankBadge} ${isTop3 ? styles.rankTop : styles.rankNormal}`}>
                  #{rank}
                </div>

                <div className={styles.collegeMeta}>
                  <div className={styles.collegeNameRow}>
                    <span className={styles.collegeName}>{college.name}</span>
                    {college.isPartner && (
                      <span className={styles.partnerBadge}>Partner</span>
                    )}
                  </div>
                  <div className={styles.collegeLocation}>
                    📍 {college.city}, {college.state} | Representative Branch: <strong>{college.repBranchCode}</strong>
                  </div>
                </div>
              </div>

              {/* Metrics Block */}
              <div className={styles.metricsBlock}>
                <span className={styles.metricLabel}>{metricLabel}</span>
                <span className={styles.metricValue}>{metricValue}</span>
              </div>

              {/* Card Actions */}
              <div className={styles.cardActions}>
                <Link href={`/predict?college=${college.id}`} className={styles.actionBtn}>
                  Predict Fit →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
