"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./discovery.module.css";

interface CollegeBranch {
  id: string;
  collegeId: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  avgSalary: number | null;
  medianSalary: number | null;
  highestSalary: number | null;
  branchStrengthScore: number;
  metadata: string | null;
}

interface College {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  officialApplyUrl: string;
  isPartner: boolean;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  metadata: string | null;
  branches: CollegeBranch[];
}

interface DiscoveryClientProps {
  initialColleges: College[];
}

export default function DiscoveryClient({ initialColleges }: DiscoveryClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [maxFees, setMaxFees] = useState<number>(500000); // Max annual tuition fee
  const [minPlacement, setMinPlacement] = useState<number>(0); // Min average package in LPA
  const [minRoi, setMinRoi] = useState<number>(0); // Min ROI multiplier (Salary / Annual Tuition)
  const [minCampusRating, setMinCampusRating] = useState<number>(0); // Out of 10
  const [selectedAccreditations, setSelectedAccreditations] = useState<string[]>([]);

  // 1. Get unique states for filter select
  const states = useMemo(() => {
    const list = new Set(initialColleges.map((c) => c.state));
    return ["ALL", ...Array.from(list)];
  }, [initialColleges]);

  // 2. Filter logic
  const filteredColleges = useMemo(() => {
    return initialColleges.filter((college) => {
      // 1. Search text match
      const matchesSearch =
        college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        college.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        college.state.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. State filter
      if (selectedState !== "ALL" && college.state !== selectedState) return false;

      // Parse metadata for campus/accreditation checks
      const meta = college.metadata ? JSON.parse(college.metadata) : {};

      // 3. Campus Life & Crowd check (collegeLifeScore serves as this metric)
      if (college.collegeLifeScore < minCampusRating) return false;

      // 4. Accreditation filter (mock validation based on name or metadata)
      if (selectedAccreditations.length > 0) {
        const acc = meta.accreditation || (college.isPartner ? ["NAAC A++", "NBA"] : ["NAAC A"]);
        const hasAcc = selectedAccreditations.every((a) => acc.includes(a));
        if (!hasAcc) return false;
      }

      // Check branch-specific conditions
      // A college passes if at least one branch satisfies branch code, fees, placement, and ROI criteria
      const hasMatchingBranch = college.branches.some((branch) => {
        // Branch code match
        if (selectedBranches.length > 0 && !selectedBranches.includes(branch.branchCode)) {
          return false;
        }

        // Annual Tuition Fee limit check
        if (branch.tuitionFeeAnnual > maxFees) return false;

        // Placements package (converted from LPA input to absolute INR value)
        const avgPkg = branch.avgSalary || 0;
        if (avgPkg < minPlacement * 100000) return false;

        // ROI calculation: dynamic ratio = average package / annual tuition fee
        const roiRatio = branch.tuitionFeeAnnual > 0 ? avgPkg / branch.tuitionFeeAnnual : 0;
        if (roiRatio < minRoi) return false;

        return true;
      });

      // If college has no branches (fallback check) or matches branch checks
      if (college.branches.length > 0 && !hasMatchingBranch) return false;

      return true;
    });
  }, [
    initialColleges,
    searchTerm,
    selectedState,
    selectedBranches,
    maxFees,
    minPlacement,
    minRoi,
    minCampusRating,
    selectedAccreditations,
  ]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedState("ALL");
    setSelectedBranches([]);
    setMaxFees(500000);
    setMinPlacement(0);
    setMinRoi(0);
    setMinCampusRating(0);
    setSelectedAccreditations([]);
  };

  const handleBranchToggle = (code: string) => {
    setSelectedBranches((prev) =>
      prev.includes(code) ? prev.filter((b) => b !== code) : [...prev, code]
    );
  };

  const handleAccreditationToggle = (acc: string) => {
    setSelectedAccreditations((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Filter Panel */}
      <aside className={styles.sidebar}>
        <div className={styles.filterHeader}>
          <h3>Filter by</h3>
          <button className={styles.clearBtn} onClick={handleClearFilters}>
            Clear
          </button>
        </div>

        {/* State Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Select State</div>
          <select
            className={styles.selectInput}
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            {states.map((st) => (
              <option key={st} value={st}>
                {st === "ALL" ? "All States" : st}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Preferred Branch</div>
          {["CSE", "IT", "ECE", "ME", "CE"].map((code) => (
            <label key={code} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedBranches.includes(code)}
                onChange={() => handleBranchToggle(code)}
              />
              {code}
            </label>
          ))}
        </div>

        {/* Max Annual Tuition Fee Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Max Annual Fees (Tuition)</div>
          <div className={styles.rangeInputs}>
            <input
              type="range"
              min="100000"
              max="500000"
              step="20000"
              value={maxFees}
              onChange={(e) => setMaxFees(Number(e.target.value))}
              style={{ accentColor: "var(--brand-green)" }}
            />
            <span className={styles.rangeText}>₹{(maxFees / 100000).toFixed(2)} Lakh / yr</span>
          </div>
        </div>

        {/* Min Placements Package Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Min Average Salary</div>
          <div className={styles.rangeInputs}>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={minPlacement}
              onChange={(e) => setMinPlacement(Number(e.target.value))}
              style={{ accentColor: "var(--brand-green)" }}
            />
            <span className={styles.rangeText}>{minPlacement > 0 ? `${minPlacement} LPA+` : "Any Placements"}</span>
          </div>
        </div>

        {/* Min ROI Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Flagship ROI Ratio</div>
          <div className={styles.rangeInputs}>
            <input
              type="range"
              min="0"
              max="4"
              step="0.5"
              value={minRoi}
              onChange={(e) => setMinRoi(Number(e.target.value))}
              style={{ accentColor: "var(--brand-green)" }}
            />
            <span className={styles.rangeText}>
              {minRoi > 0 ? `${minRoi}x Return+ (Salary/Tuition)` : "Any ROI"}
            </span>
          </div>
        </div>

        {/* Campus Life & Crowd Rating Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Min Campus Life & Crowd</div>
          <div className={styles.rangeInputs}>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={minCampusRating}
              onChange={(e) => setMinCampusRating(Number(e.target.value))}
              style={{ accentColor: "var(--brand-green)" }}
            />
            <span className={styles.rangeText}>
              {minCampusRating > 0 ? `${minCampusRating}/10+ Score` : "Any Quality"}
            </span>
          </div>
        </div>

        {/* Accreditation Filter */}
        <div className={styles.filterGroup}>
          <div className={styles.filterTitle}>Accreditation</div>
          {["NAAC A++", "NBA"].map((acc) => (
            <label key={acc} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedAccreditations.includes(acc)}
                onChange={() => handleAccreditationToggle(acc)}
              />
              {acc}
            </label>
          ))}
        </div>
      </aside>

      {/* College Listings Workspace */}
      <section className={styles.content}>
        <input
          type="text"
          className={styles.searchBar}
          placeholder="Search colleges by name, city, or state..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className={styles.resultsHeader}>
          <span>Showing {filteredColleges.length} colleges matching preferences</span>
          <span>Filtered from {initialColleges.length} total colleges</span>
        </div>

        {/* Grid Layout of Colleges */}
        <div className={styles.collegeGrid}>
          {filteredColleges.map((college) => {
            // Pick representative branch details (e.g. CSE branch details or first branch)
            const repBranch = college.branches.find((b) => b.branchCode === "CSE") || college.branches[0];
            const avgTuition = repBranch ? repBranch.tuitionFeeAnnual : 0;
            const avgSalary = repBranch ? repBranch.avgSalary || 0 : 0;
            const roiVal = avgTuition > 0 ? avgSalary / avgTuition : 0;

            return (
              <div key={college.id} className={styles.collegeCard}>
                <div>
                  <div className={styles.cardTop}>
                    {college.logoUrl ? (
                      <img src={college.logoUrl} alt={college.name} className={styles.logoImage} />
                    ) : (
                      <div className={styles.logoPlaceholder}>
                        {college.name.charAt(0)}
                      </div>
                    )}
                    <div className={styles.cardHeaderInfo}>
                      <h4 className={styles.collegeName}>{college.name}</h4>
                      <span className={styles.collegeLocation}>
                        📍 {college.city}, {college.state}
                      </span>
                      {college.isPartner && <span className={styles.partnerBadge}>Partner</span>}
                    </div>
                  </div>

                  {/* Core Metrics */}
                  <div className={styles.cardStats}>
                    <div className={styles.statBlock}>
                      <span className={styles.statLabel}>Avg Tuition</span>
                      <span className={styles.statValue}>
                        {avgTuition > 0 ? `₹${(avgTuition / 100000).toFixed(2)} L/yr` : "N/A"}
                      </span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statLabel}>Avg Placement</span>
                      <span className={styles.statValue}>
                        {avgSalary > 0 ? `₹${(avgSalary / 100000).toFixed(1)} LPA` : "N/A"}
                      </span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statLabel}>ROI Ratio</span>
                      <span className={styles.statValue} style={{ color: "var(--brand-blue)" }}>
                        {roiVal > 0 ? `${roiVal.toFixed(1)}x Return` : "N/A"}
                      </span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statLabel}>Campus Score</span>
                      <span className={styles.statValue} style={{ color: "var(--brand-green)" }}>
                        {college.collegeLifeScore}/10
                      </span>
                    </div>
                  </div>

                  {/* Supported Branches */}
                  <div className={styles.cardBranches}>
                    <div className={styles.branchTitle}>Branches</div>
                    <div className={styles.branchTags}>
                      {college.branches.map((b) => (
                        <span key={b.id} className={styles.branchTag}>
                          {b.branchCode}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Link href={`/compare?add=${college.id}`} className={styles.viewBtn}>
                    Compare
                  </Link>
                  <Link href={`/predict?college=${college.id}`} className={styles.applyBtn}>
                    Predict Fit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
