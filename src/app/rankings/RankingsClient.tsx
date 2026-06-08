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
          ROI Ranking <span className={styles.flagshipBadge}>Flagship</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "overall" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("overall")}
        >
          Overall Ranking
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "affordability" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("affordability")}
        >
          Value / Affordability
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "curriculum" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("curriculum")}
        >
          Curriculum Strength
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "opportunities" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("opportunities")}
        >
          Industry Opportunities
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.rankingsTable}>
          <thead>
            <tr>
              <th className={styles.rankNumber}>Rank</th>
              <th>College</th>
              {activeTab === "roi" && <th>Avg Tuition</th>}
              {activeTab === "roi" && <th>Avg Package</th>}
              {activeTab === "affordability" && <th>Total Cost (Lakh/yr)</th>}
              <th>Score / Metric</th>
              <th className={styles.actionCell}>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {rankedColleges.map((college, index) => (
              <tr key={college.id}>
                <td className={styles.rankNumber}>#{index + 1}</td>
                <td>
                  <div className={styles.collegeCell}>
                    {college.logoUrl ? (
                      <img src={college.logoUrl} alt={college.name} className={styles.logoImage} />
                    ) : (
                      <div className={styles.logoPlaceholder}>{college.name.charAt(0)}</div>
                    )}
                    <div>
                      <span className={styles.collegeName}>{college.name}</span>
                      <div className={styles.collegeLocation}>
                        📍 {college.city}, {college.state} | {college.repBranchCode} Branch
                      </div>
                    </div>
                  </div>
                </td>
                {activeTab === "roi" && (
                  <td>₹{(college.tuition / 100000).toFixed(2)} L/yr</td>
                )}
                {activeTab === "roi" && (
                  <td>₹{(college.salary / 100000).toFixed(1)} LPA</td>
                )}
                {activeTab === "affordability" && (
                  <td>₹{(college.totalCost / 100000).toFixed(2)} L</td>
                )}
                <td>
                  <span className={styles.scoreBadge}>
                    {activeTab === "roi" && `${college.roiRatio.toFixed(1)}x ROI`}
                    {activeTab === "overall" && `${college.overallScore.toFixed(1)}%`}
                    {activeTab === "affordability" && `₹${(college.totalCost / 100000).toFixed(2)} L`}
                    {activeTab === "curriculum" && `${college.curriculumScore}/10 Score`}
                    {activeTab === "opportunities" && `${college.placementScore}/10 Score`}
                  </span>
                </td>
                <td className={styles.actionCell}>
                  <Link href={`/predict?college=${college.id}`} className={styles.actionBtn}>
                    Predict Fit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
