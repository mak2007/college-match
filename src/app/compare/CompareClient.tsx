"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./compare.module.css";

interface CollegeBranch {
  id: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  avgSalary: number | null;
  medianSalary: number | null;
  highestSalary: number | null;
  branchStrengthScore: number;
}

interface College {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  isPartner: boolean;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  metadata: string | null;
  branches: CollegeBranch[];
}

interface CompareClientProps {
  initialColleges: College[];
}

interface SlotState {
  collegeId: string;
  branchCode: string;
}

export default function CompareClient({ initialColleges }: CompareClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [slot1, setSlot1] = useState<SlotState>({ collegeId: "", branchCode: "" });
  const [slot2, setSlot2] = useState<SlotState>({ collegeId: "", branchCode: "" });
  const [slot3, setSlot3] = useState<SlotState>({ collegeId: "", branchCode: "" });

  // Load selected college from query parameter if provided (e.g. from Match or Discover redirect)
  useEffect(() => {
    const addId = searchParams.get("add");
    if (addId) {
      const coll = initialColleges.find((c) => c.id === addId);
      if (coll) {
        setSlot1({
          collegeId: coll.id,
          branchCode: coll.branches[0]?.branchCode || "",
        });
        // Clear search parameters
        router.replace("/compare");
      }
    }
  }, [searchParams, initialColleges, router]);

  // Extract selected college details
  const getSelectedData = (slot: SlotState) => {
    if (!slot.collegeId) return null;
    const college = initialColleges.find((c) => c.id === slot.collegeId);
    if (!college) return null;
    const branch = college.branches.find((b) => b.branchCode === slot.branchCode) || college.branches[0];

    const tuition = branch ? branch.tuitionFeeAnnual : 0;
    const hostel = branch ? branch.hostelFeeAnnual : 0;
    const totalCost4Yr = (tuition + hostel) * 4;
    const avgSalary = branch ? branch.avgSalary || 0 : 0;
    const roiVal = tuition > 0 ? avgSalary / tuition : 0;

    return {
      college,
      branch,
      tuition,
      hostel,
      totalCost4Yr,
      avgSalary,
      medianSalary: branch ? branch.medianSalary || 0 : 0,
      highestSalary: branch ? branch.highestSalary || 0 : 0,
      roiVal,
    };
  };

  const data1 = useMemo(() => getSelectedData(slot1), [slot1, initialColleges]);
  const data2 = useMemo(() => getSelectedData(slot2), [slot2, initialColleges]);
  const data3 = useMemo(() => getSelectedData(slot3), [slot3, initialColleges]);

  // Highlighting: find the best values among selections
  const highlights = useMemo(() => {
    const activeData = [data1, data2, data3].filter((d) => d !== null) as any[];
    if (activeData.length < 2) return {};

    const maxSalary = Math.max(...activeData.map((d) => d.avgSalary));
    const maxRoi = Math.max(...activeData.map((d) => d.roiVal));
    const minCost = Math.min(...activeData.map((d) => d.totalCost4Yr));
    const maxCampus = Math.max(...activeData.map((d) => d.college.collegeLifeScore));
    const maxCurriculum = Math.max(...activeData.map((d) => d.college.curriculumScore));

    return {
      maxSalary,
      maxRoi,
      minCost,
      maxCampus,
      maxCurriculum,
    };
  }, [data1, data2, data3]);

  // Handlers for slot selections
  const handleCollegeChange = (slotNum: 1 | 2 | 3, collId: string) => {
    const college = initialColleges.find((c) => c.id === collId);
    const firstBranch = college?.branches[0]?.branchCode || "";
    const update = { collegeId: collId, branchCode: firstBranch };

    if (slotNum === 1) setSlot1(update);
    if (slotNum === 2) setSlot2(update);
    if (slotNum === 3) setSlot3(update);
  };

  const handleBranchChange = (slotNum: 1 | 2 | 3, code: string) => {
    if (slotNum === 1) setSlot1((prev) => ({ ...prev, branchCode: code }));
    if (slotNum === 2) setSlot2((prev) => ({ ...prev, branchCode: code }));
    if (slotNum === 3) setSlot3((prev) => ({ ...prev, branchCode: code }));
  };

  const handleRemove = (slotNum: 1 | 2 | 3) => {
    const update = { collegeId: "", branchCode: "" };
    if (slotNum === 1) setSlot1(update);
    if (slotNum === 2) setSlot2(update);
    if (slotNum === 3) setSlot3(update);
  };

  // Render Slot Card Selector
  const renderSelector = (slotNum: 1 | 2 | 3, currentSlot: SlotState) => {
    const selectedColl = initialColleges.find((c) => c.id === currentSlot.collegeId);

    if (selectedColl) {
      return (
        <div className={`${styles.selectorCard} ${styles.selectorCardFilled}`}>
          <div>
            <h4 style={{ fontWeight: "800", color: "var(--brand-green)" }}>{selectedColl.name}</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--light-text-secondary)", marginTop: "0.25rem" }}>
              📍 {selectedColl.city}, {selectedColl.state}
            </p>

            {/* Branch Selector */}
            <select
              className={styles.selectInput}
              value={currentSlot.branchCode}
              onChange={(e) => handleBranchChange(slotNum, e.target.value)}
            >
              {selectedColl.branches.map((b) => (
                <option key={b.id} value={b.branchCode}>
                  {b.branchCode} ({b.branchName})
                </option>
              ))}
            </select>
          </div>
          <button className={styles.removeBtn} onClick={() => handleRemove(slotNum)}>
            Remove
          </button>
        </div>
      );
    }

    return (
      <div className={styles.selectorCard}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>➕</div>
        <h4 style={{ color: "var(--light-text-secondary)" }}>Select College to Compare</h4>
        <select
          className={styles.selectInput}
          value=""
          onChange={(e) => handleCollegeChange(slotNum, e.target.value)}
        >
          <option value="" disabled>
            -- Choose College --
          </option>
          {initialColleges
            .filter((c) => c.id !== slot1.collegeId && c.id !== slot2.collegeId && c.id !== slot3.collegeId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>Side-by-Side Comparison</h2>
        <p>Analyze and compare engineering colleges across placements, ROI, cost, and campus life</p>
      </div>

      {/* Selectors */}
      <div className={styles.selectorGrid}>
        {renderSelector(1, slot1)}
        {renderSelector(2, slot2)}
        {renderSelector(3, slot3)}
      </div>

      {/* Compare table details */}
      <div className={styles.comparisonGrid}>
        {/* Name Row */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>College Name</div>
          <div className={styles.valueCell}>
            {data1 ? <strong>{data1.college.name}</strong> : <span className={styles.emptyCell}>Empty slot</span>}
          </div>
          <div className={styles.valueCell}>
            {data2 ? <strong>{data2.college.name}</strong> : <span className={styles.emptyCell}>Empty slot</span>}
          </div>
          <div className={styles.valueCell}>
            {data3 ? <strong>{data3.college.name}</strong> : <span className={styles.emptyCell}>Empty slot</span>}
          </div>
        </div>

        {/* Selected Branch Row */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Selected Branch</div>
          <div className={styles.valueCell}>{data1 ? data1.branch.branchCode : "-"}</div>
          <div className={styles.valueCell}>{data2 ? data2.branch.branchCode : "-"}</div>
          <div className={styles.valueCell}>{data3 ? data3.branch.branchCode : "-"}</div>
        </div>

        {/* Annual Cost Row */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Annual Cost</div>
          <div className={styles.valueCell}>
            {data1 ? `₹${((data1.tuition + data1.hostel) / 100000).toFixed(2)} Lakh` : "-"}
          </div>
          <div className={styles.valueCell}>
            {data2 ? `₹${((data2.tuition + data2.hostel) / 100000).toFixed(2)} Lakh` : "-"}
          </div>
          <div className={styles.valueCell}>
            {data3 ? `₹${((data3.tuition + data3.hostel) / 100000).toFixed(2)} Lakh` : "-"}
          </div>
        </div>

        {/* Total 4-Yr Tuition + Hostel Cost */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Total 4-Yr Cost</div>
          <div className={`${styles.valueCell} ${data1 && data1.totalCost4Yr === highlights.minCost ? styles.valueCellHighlight : ""}`}>
            {data1 ? `₹${(data1.totalCost4Yr / 100000).toFixed(1)} Lakh` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data2 && data2.totalCost4Yr === highlights.minCost ? styles.valueCellHighlight : ""}`}>
            {data2 ? `₹${(data2.totalCost4Yr / 100000).toFixed(1)} Lakh` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data3 && data3.totalCost4Yr === highlights.minCost ? styles.valueCellHighlight : ""}`}>
            {data3 ? `₹${(data3.totalCost4Yr / 100000).toFixed(1)} Lakh` : "-"}
          </div>
        </div>

        {/* Placement Average package */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Average Package</div>
          <div className={`${styles.valueCell} ${data1 && data1.avgSalary === highlights.maxSalary ? styles.valueCellHighlight : ""}`}>
            {data1 && data1.avgSalary > 0 ? `₹${(data1.avgSalary / 100000).toFixed(1)} LPA` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data2 && data2.avgSalary === highlights.maxSalary ? styles.valueCellHighlight : ""}`}>
            {data2 && data2.avgSalary > 0 ? `₹${(data2.avgSalary / 100000).toFixed(1)} LPA` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data3 && data3.avgSalary === highlights.maxSalary ? styles.valueCellHighlight : ""}`}>
            {data3 && data3.avgSalary > 0 ? `₹${(data3.avgSalary / 100000).toFixed(1)} LPA` : "-"}
          </div>
        </div>

        {/* ROI Flagship ratio */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Flagship ROI Ratio</div>
          <div className={`${styles.valueCell} ${data1 && data1.roiVal === highlights.maxRoi ? styles.valueCellHighlight : ""}`}>
            {data1 ? `${data1.roiVal.toFixed(1)}x Return` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data2 && data2.roiVal === highlights.maxRoi ? styles.valueCellHighlight : ""}`}>
            {data2 ? `${data2.roiVal.toFixed(1)}x Return` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data3 && data3.roiVal === highlights.maxRoi ? styles.valueCellHighlight : ""}`}>
            {data3 ? `${data3.roiVal.toFixed(1)}x Return` : "-"}
          </div>
        </div>

        {/* Campus Life score */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Campus Life & Crowd</div>
          <div className={`${styles.valueCell} ${data1 && data1.college.collegeLifeScore === highlights.maxCampus ? styles.valueCellHighlight : ""}`}>
            {data1 ? `${data1.college.collegeLifeScore}/10 Score` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data2 && data2.college.collegeLifeScore === highlights.maxCampus ? styles.valueCellHighlight : ""}`}>
            {data2 ? `${data2.college.collegeLifeScore}/10 Score` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data3 && data3.college.collegeLifeScore === highlights.maxCampus ? styles.valueCellHighlight : ""}`}>
            {data3 ? `${data3.college.collegeLifeScore}/10 Score` : "-"}
          </div>
        </div>

        {/* Curriculum Score */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Curriculum Standard</div>
          <div className={`${styles.valueCell} ${data1 && data1.college.curriculumScore === highlights.maxCurriculum ? styles.valueCellHighlight : ""}`}>
            {data1 ? `${data1.college.curriculumScore}/10 Score` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data2 && data2.college.curriculumScore === highlights.maxCurriculum ? styles.valueCellHighlight : ""}`}>
            {data2 ? `${data2.college.curriculumScore}/10 Score` : "-"}
          </div>
          <div className={`${styles.valueCell} ${data3 && data3.college.curriculumScore === highlights.maxCurriculum ? styles.valueCellHighlight : ""}`}>
            {data3 ? `${data3.college.curriculumScore}/10 Score` : "-"}
          </div>
        </div>

        {/* Location Row */}
        <div className={styles.compareRow}>
          <div className={styles.labelCell}>Location</div>
          <div className={styles.valueCell}>{data1 ? `${data1.college.city}, ${data1.college.state}` : "-"}</div>
          <div className={styles.valueCell}>{data2 ? `${data2.college.city}, ${data2.college.state}` : "-"}</div>
          <div className={styles.valueCell}>{data3 ? `${data3.college.city}, ${data3.college.state}` : "-"}</div>
        </div>
      </div>
    </div>
  );
}
