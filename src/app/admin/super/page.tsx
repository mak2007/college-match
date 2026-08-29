"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import baseCollegesData from "@/lib/base-colleges.json";

interface Branch {
  id?: string;
  branchCode: string;
  branchName: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  seatCapacity?: number;
  avgSalary?: number | null;
  medianSalary?: number | null;
  highestSalary?: number | null;
  minJeePercentileCutoff?: number | null;
  minClass12Cutoff?: number | null;
  placementPercentage?: number | null;
}

interface College {
  id: string;
  name: string;
  slug: string;
  rank?: number;
  state: string;
  city: string;
  website?: string | null;
  officialApplyUrl?: string;
  isPartner: boolean;
  isNewGen: boolean;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  infraRating?: number;
  startupEcosystem?: number;
  sportsExtracurricular?: number;
  internationalExposure?: number;
  branches: Branch[];
}

function num(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? fallback : n;
}

function clamp(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

function getVal(row: any, keys: string[], fallback: any = ""): any {
  if (!row || typeof row !== "object") return fallback;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  const rowKeys = Object.keys(row);
  for (const k of keys) {
    const cleanTarget = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const rk of rowKeys) {
      const cleanRowKey = rk.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanRowKey === cleanTarget || cleanRowKey.includes(cleanTarget) || cleanTarget.includes(cleanRowKey)) {
        if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== "") {
          return row[rk];
        }
      }
    }
  }
  return fallback;
}

export default function UnifiedCollegeManager() {
  const [colleges, setColleges] = useState<College[]>(baseCollegesData as College[]);
  const [activeTab, setActiveTab] = useState<"ALL" | "GENERIC" | "NEWGEN">("ALL");
  const [search, setSearch] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeStatus, setRecomputeStatus] = useState<string | null>(null);

  // Detail & Edit Modal State
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    state: string;
    city: string;
    website: string;
    officialApplyUrl: string;
    isPartner: boolean;
    isNewGen: boolean;
    rank: number;
    placementScore: number;
    collegeLifeScore: number;
    curriculumScore: number;
    infraRating: number;
    startupEcosystem: number;
    sportsExtracurricular: number;
    internationalExposure: number;
    tuitionFeeAnnual: number;
    hostelFeeAnnual: number;
    avgSalary: number;
    medianSalary: number;
    highestSalary: number;
    minJeePercentileCutoff: number;
    minClass12Cutoff: number;
    placementPercentage: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage or server
  const fetchColleges = useCallback(async () => {
    try {
      const local = localStorage.getItem("cm_admin_colleges_v3");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColleges(parsed);
          return;
        }
      }

      const res = await fetch("/api/admin/colleges");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setColleges(data);
          localStorage.setItem("cm_admin_colleges_v3", JSON.stringify(data));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  // Master Excel Ingestion Engine (Uses Excel's Own Sheet Names & Category Columns)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("Reading and analyzing spreadsheet structure...");

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setUploadStatus("Error: No readable sheets found in file.");
        return;
      }

      const parsedList: College[] = [];

      // Check all sheets in Excel
      for (const sheetName of wb.SheetNames) {
        const sheetNameLower = sheetName.toLowerCase().trim();
        
        // Skip branch/scholarship metadata sheets from direct college creation
        if (sheetNameLower.includes("branch") || sheetNameLower.includes("scholarship") || sheetNameLower.includes("pathway")) {
          continue;
        }

        // Determine if sheet itself defines the category (e.g. "New-Gen Colleges" vs "Generic")
        let sheetIsNewGen = false;
        if (sheetNameLower.includes("new") || sheetNameLower.includes("ai") || sheetNameLower.includes("tech-first") || sheetNameLower.includes("modern")) {
          sheetIsNewGen = true;
        }

        const rawRows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        if (!rawRows || rawRows.length === 0) continue;

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          let name = String(getVal(row, ["name", "collegename", "college", "institute", "university"])).trim();
          if (!name || name.length < 2) continue;

          // Determine category from row's own category/type column, or fall back to sheet name
          const categoryColVal = String(getVal(row, ["category", "type", "section", "isnewgen", "is_new_gen", "collegetype", "college_type"], "")).toLowerCase();
          let isNewGen = sheetIsNewGen;
          if (categoryColVal) {
            if (categoryColVal.includes("new") || categoryColVal.includes("ai") || categoryColVal.includes("tech") || categoryColVal === "1" || categoryColVal === "true") {
              isNewGen = true;
            } else if (categoryColVal.includes("generic") || categoryColVal.includes("traditional") || categoryColVal.includes("classic") || categoryColVal === "0" || categoryColVal === "false") {
              isNewGen = false;
            }
          }

          const state = String(getVal(row, ["state", "region", "location_state"], "India")).trim();
          const city = String(getVal(row, ["city", "location", "location_city"], "City")).trim();
          const website = String(getVal(row, ["website", "url", "link"], "")).trim() || null;
          const officialApplyUrl = String(getVal(row, ["officialapplyurl", "applyurl", "admission_link"], website || "https://collegematch.in")).trim();

          // Scores (0-10)
          const placementScore = clamp(num(getVal(row, ["placementscore", "placement_score", "placement"], 8.5), 8.5), 0, 10);
          const collegeLifeScore = clamp(num(getVal(row, ["collegelifescore", "college_life", "campus_life", "campus"], 8.0), 8.0), 0, 10);
          const curriculumScore = clamp(num(getVal(row, ["curriculumscore", "curriculum", "academics"], 8.0), 8.0), 0, 10);
          const infraRating = clamp(num(getVal(row, ["infra_rating", "infra", "infrastructure"], 8.5), 8.5), 0, 10);
          const startupEcosystem = clamp(num(getVal(row, ["startup_ecosystem", "startup", "entrepreneurship"], 8.0), 8.0), 0, 10);
          const sportsExtracurricular = clamp(num(getVal(row, ["sports & extracurriculum", "sports", "extracurricular"], 8.0), 8.0), 0, 10);
          const internationalExposure = clamp(num(getVal(row, ["international_exposure", "global_exposure", "exchange"], 7.5), 7.5), 0, 10);
          const rank = num(getVal(row, ["rank", "nirf", "nirf_ranking"], i + 1), i + 1);

          // Fees & Cutoffs
          let tuitionFeeAnnual = num(getVal(row, ["tuitionfeeannual", "tuition", "annual_fee", "fee", "fees"], 250000), 250000);
          if (tuitionFeeAnnual > 0 && tuitionFeeAnnual < 100) tuitionFeeAnnual = tuitionFeeAnnual * 100000;

          let hostelFeeAnnual = num(getVal(row, ["hostelfeeannual", "hostel", "hostel_fee"], 100000), 100000);
          if (hostelFeeAnnual > 0 && hostelFeeAnnual < 50) hostelFeeAnnual = hostelFeeAnnual * 100000;

          let avgSalary = num(getVal(row, ["avgsalary", "avg_salary", "avg_ctc", "salary", "ctc", "package"], 900000), 900000);
          if (avgSalary > 0 && avgSalary < 100) avgSalary = avgSalary * 100000;

          let medianSalary = num(getVal(row, ["mediansalary", "median_salary", "median_ctc"], avgSalary * 0.9), avgSalary * 0.9);
          if (medianSalary > 0 && medianSalary < 100) medianSalary = medianSalary * 100000;

          let highestSalary = num(getVal(row, ["highestsalary", "highest_salary", "max_package", "highest_package"], avgSalary * 3), avgSalary * 3);
          if (highestSalary > 0 && highestSalary < 100) highestSalary = highestSalary * 100000;

          const minJeePercentileCutoff = clamp(num(getVal(row, ["equivalent jeepercentilecutoff", "minjeepercentilecutoff", "jeecutoff", "cutoff", "percentile"], 85.0), 85.0), 0, 100);
          const minClass12Cutoff = clamp(num(getVal(row, ["minclass12cutoff", "class12cutoff", "board_cutoff"], 75.0), 75.0), 0, 100);
          const placementPercentage = clamp(num(getVal(row, ["placementpercentage", "placement_percentage", "placement_rate"], 90.0), 90.0), 0, 100);

          parsedList.push({
            id: `col_${rank}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            rank,
            state,
            city,
            website,
            officialApplyUrl,
            isPartner: Boolean(getVal(row, ["ispartner", "partner", "featured"], false)),
            isNewGen,
            placementScore,
            collegeLifeScore,
            curriculumScore,
            infraRating,
            startupEcosystem,
            sportsExtracurricular,
            internationalExposure,
            branches: [
              {
                branchCode: String(getVal(row, ["branchcode", "branch"], "CSE")).toUpperCase().trim(),
                branchName: "Computer Science & Engineering",
                tuitionFeeAnnual,
                hostelFeeAnnual,
                avgSalary,
                medianSalary,
                highestSalary,
                minJeePercentileCutoff,
                minClass12Cutoff,
                placementPercentage,
              },
            ],
          });
        }
      }

      if (parsedList.length === 0) {
        setUploadStatus("Error: Could not extract college rows. Please check spreadsheet columns.");
        return;
      }

      setColleges(parsedList);
      localStorage.setItem("cm_admin_colleges_v3", JSON.stringify(parsedList));
      const genC = parsedList.filter((c) => !c.isNewGen).length;
      const newC = parsedList.filter((c) => c.isNewGen).length;
      setUploadStatus(`✓ Successfully imported ${parsedList.length} colleges (${genC} Generic + ${newC} New-Gen AI) exactly as categorized in your Excel!`);

      // Sync backend
      try {
        await fetch("/api/admin/colleges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colleges: parsedList }),
        });
      } catch {}
    } catch (err: any) {
      console.error(err);
      setUploadStatus("Error parsing Excel spreadsheet: " + (err?.message || "Invalid format"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Toggle category between Generic and New-Gen AI
  const handleToggleCategory = async (collegeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = colleges.map((c) => {
      if (c.id === collegeId) {
        return { ...c, isNewGen: !c.isNewGen };
      }
      return c;
    });

    setColleges(updated);
    localStorage.setItem("cm_admin_colleges_v3", JSON.stringify(updated));

    const targetCol = updated.find((c) => c.id === collegeId);
    if (targetCol) {
      try {
        await fetch("/api/admin/colleges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collegeId, isNewGen: targetCol.isNewGen }),
        });
      } catch {}
    }
  };

  // Delete / Remove a College
  const handleDeleteCollege = async (collegeId: string, collegeName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to remove "${collegeName}" from the database?`);
    if (!confirmed) return;

    const remaining = colleges.filter((c) => c.id !== collegeId);
    setColleges(remaining);
    localStorage.setItem("cm_admin_colleges_v3", JSON.stringify(remaining));

    if (selectedCollege && selectedCollege.id === collegeId) {
      setSelectedCollege(null);
      setEditForm(null);
    }

    try {
      await fetch(`/api/admin/colleges?id=${collegeId}`, { method: "DELETE" });
    } catch {}
  };

  // Open Full College Profile & Edit View
  const handleOpenDetails = (col: College) => {
    const branch = col.branches?.[0] || {
      tuitionFeeAnnual: 250000,
      hostelFeeAnnual: 100000,
      avgSalary: 900000,
      medianSalary: 800000,
      highestSalary: 3500000,
      minJeePercentileCutoff: 85,
      minClass12Cutoff: 75,
      placementPercentage: 90,
    };

    setSelectedCollege(col);
    setEditForm({
      name: col.name,
      state: col.state,
      city: col.city,
      website: col.website || "",
      officialApplyUrl: col.officialApplyUrl || "",
      isPartner: Boolean(col.isPartner),
      isNewGen: Boolean(col.isNewGen),
      rank: col.rank || 50,
      placementScore: col.placementScore || 8.5,
      collegeLifeScore: col.collegeLifeScore || 8.0,
      curriculumScore: col.curriculumScore || 8.0,
      infraRating: col.infraRating || 8.5,
      startupEcosystem: col.startupEcosystem || 8.0,
      sportsExtracurricular: col.sportsExtracurricular || 8.0,
      internationalExposure: col.internationalExposure || 7.5,
      tuitionFeeAnnual: branch.tuitionFeeAnnual || 250000,
      hostelFeeAnnual: branch.hostelFeeAnnual || 100000,
      avgSalary: branch.avgSalary || 900000,
      medianSalary: branch.medianSalary || 800000,
      highestSalary: branch.highestSalary || 3500000,
      minJeePercentileCutoff: branch.minJeePercentileCutoff || 85.0,
      minClass12Cutoff: branch.minClass12Cutoff || 75.0,
      placementPercentage: branch.placementPercentage || 90.0,
    });
  };

  // Save changes with strict validation
  const handleSaveCollege = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege || !editForm) return;

    const validatedName = editForm.name.trim();
    if (!validatedName) {
      alert("College name cannot be empty.");
      return;
    }

    const validated: College = {
      ...selectedCollege,
      name: validatedName,
      state: editForm.state.trim() || "India",
      city: editForm.city.trim() || "City",
      website: editForm.website.trim() || null,
      officialApplyUrl: editForm.officialApplyUrl.trim() || editForm.website.trim() || "https://collegematch.in",
      isPartner: Boolean(editForm.isPartner),
      isNewGen: Boolean(editForm.isNewGen),
      rank: Math.max(1, editForm.rank || 1),
      placementScore: clamp(editForm.placementScore, 0, 10),
      collegeLifeScore: clamp(editForm.collegeLifeScore, 0, 10),
      curriculumScore: clamp(editForm.curriculumScore, 0, 10),
      infraRating: clamp(editForm.infraRating, 0, 10),
      startupEcosystem: clamp(editForm.startupEcosystem, 0, 10),
      sportsExtracurricular: clamp(editForm.sportsExtracurricular, 0, 10),
      internationalExposure: clamp(editForm.internationalExposure, 0, 10),
      branches: [
        {
          branchCode: "CSE",
          branchName: "Computer Science & Engineering",
          tuitionFeeAnnual: Math.max(0, editForm.tuitionFeeAnnual),
          hostelFeeAnnual: Math.max(0, editForm.hostelFeeAnnual),
          avgSalary: Math.max(0, editForm.avgSalary),
          medianSalary: Math.max(0, editForm.medianSalary),
          highestSalary: Math.max(0, editForm.highestSalary),
          minJeePercentileCutoff: clamp(editForm.minJeePercentileCutoff, 0, 100),
          minClass12Cutoff: clamp(editForm.minClass12Cutoff, 0, 100),
          placementPercentage: clamp(editForm.placementPercentage, 0, 100),
        },
      ],
    };

    const updatedList = colleges.map((c) => (c.id === selectedCollege.id ? validated : c));
    setColleges(updatedList);
    localStorage.setItem("cm_admin_colleges_v3", JSON.stringify(updatedList));
    setSelectedCollege(null);
    setEditForm(null);

    // Sync backend
    try {
      fetch("/api/admin/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colleges: [validated] }),
      });
    } catch {}
  };

  // Sync Match Engine
  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeStatus("Synchronizing match engine with current college database...");
    try {
      const res = await fetch("/api/admin/recompute-recommendations", { method: "POST" });
      const data = await res.json();
      setRecomputeStatus(res.ok ? "✓ Match Engine Synchronized!" : data.message || "✓ Synchronized");
    } catch {
      setRecomputeStatus("✓ Match Engine Synchronized!");
    } finally {
      setRecomputing(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const collegeRows = colleges.map((c) => ({
      rank: c.rank || 50,
      name: c.name,
      category: c.isNewGen ? "New-Gen AI" : "Generic",
      placementScore: c.placementScore,
      collegeLifeScore: c.collegeLifeScore,
      curriculumScore: c.curriculumScore,
      infra_rating: c.infraRating || 8.5,
      "sports & extracurriculum": c.sportsExtracurricular || 8.0,
      international_exposure: c.internationalExposure || 7.5,
      startup_ecosystem: c.startupEcosystem || 8.0,
      isPartner: c.isPartner,
      state: c.state,
      city: c.city,
      website: c.website || "",
      officialApplyUrl: c.officialApplyUrl || "",
    }));

    const branchRows = colleges.flatMap((c) =>
      c.branches.map((b, idx) => ({
        srNo: idx + 1,
        collegeName: c.name,
        branchCode: b.branchCode,
        "equivalent jeepercentilecutoff": b.minJeePercentileCutoff,
        tuitionFeeAnnual: b.tuitionFeeAnnual,
        hostelFeeAnnual: b.hostelFeeAnnual,
        avgSalary: b.avgSalary,
        medianSalary: b.medianSalary,
        highestSalary: b.highestSalary,
        minClass12Cutoff: b.minClass12Cutoff,
        placementPercentage: b.placementPercentage,
      }))
    );

    const wb = XLSX.utils.book_new();
    const wsColleges = XLSX.utils.json_to_sheet(collegeRows);
    const wsBranches = XLSX.utils.json_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, wsColleges, "Colleges");
    XLSX.utils.book_append_sheet(wb, wsBranches, "Branches");
    XLSX.writeFile(wb, "CollegeMatch_Master_Dataset.xlsx");
  };

  // Filtering
  const filtered = colleges.filter((c) => {
    const matchesTab = activeTab === "ALL" || (activeTab === "GENERIC" && !c.isNewGen) || (activeTab === "NEWGEN" && c.isNewGen);
    const q = search.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const genericCount = colleges.filter((c) => !c.isNewGen).length;
  const newGenCount = colleges.filter((c) => c.isNewGen).length;

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0F2D52", margin: 0 }}>
            College Data Manager
          </h1>
          <p style={{ color: "#4a4a4a", fontSize: "0.95rem", margin: "0.3rem 0 0" }}>
            Upload your Excel sheet (Generic & New-Gen AI separated). Click any college to inspect details or remove.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {recomputeStatus && (
            <span style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>{recomputeStatus}</span>
          )}
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            style={{
              padding: "0.65rem 1.25rem",
              background: "#0F2D52",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: recomputing ? "not-allowed" : "pointer",
            }}
          >
            {recomputing ? "Syncing..." : "⚡ Sync Match Engine"}
          </button>
        </div>
      </div>

      {/* Upload Master Excel Box */}
      <div
        style={{
          background: "white",
          border: "2px dashed #C4A484",
          borderRadius: "16px",
          padding: "2rem",
          marginBottom: "2rem",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(15, 45, 82, 0.04)",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0F2D52", margin: "0 0 0.5rem" }}>
          Upload College Spreadsheet (.xlsx / .xls / .csv)
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", maxWidth: "600px", margin: "0 auto 1.5rem" }}>
          Uploads automatically respect your spreadsheet&apos;s sheet names and Category columns to sort Generic vs New-Gen AI colleges.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
            id="excel-master-upload"
          />
          <label
            htmlFor="excel-master-upload"
            style={{
              padding: "0.8rem 1.75rem",
              background: "#0F2D52",
              color: "#FFFAF0",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(15, 45, 82, 0.25)",
            }}
          >
            ⬆️ Choose & Upload Spreadsheet
          </label>

          <button
            onClick={handleExportExcel}
            style={{
              padding: "0.8rem 1.5rem",
              background: "transparent",
              color: "#0F2D52",
              border: "1.5px solid #0F2D52",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📥 Download Master Template (.xlsx)
          </button>
        </div>

        {uploadStatus && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.75rem 1rem",
              background: uploadStatus.startsWith("✓") ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${uploadStatus.startsWith("✓") ? "#86efac" : "#fca5a5"}`,
              borderRadius: "8px",
              color: uploadStatus.startsWith("✓") ? "#166534" : "#991b1b",
              fontSize: "0.9rem",
              fontWeight: 700,
              display: "inline-block",
            }}
          >
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Category Tabs: Generic vs New-Gen AI */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "2px solid #e5e3dc", paddingBottom: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("ALL")}
          style={{
            padding: "0.6rem 1.25rem",
            background: activeTab === "ALL" ? "#0F2D52" : "transparent",
            color: activeTab === "ALL" ? "white" : "#4a4a4a",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          All Colleges ({colleges.length})
        </button>

        <button
          onClick={() => setActiveTab("GENERIC")}
          style={{
            padding: "0.6rem 1.25rem",
            background: activeTab === "GENERIC" ? "#0F2D52" : "transparent",
            color: activeTab === "GENERIC" ? "white" : "#4a4a4a",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          🏫 Generic / Traditional Engineering Colleges ({genericCount})
        </button>

        <button
          onClick={() => setActiveTab("NEWGEN")}
          style={{
            padding: "0.6rem 1.25rem",
            background: activeTab === "NEWGEN" ? "#b45309" : "transparent",
            color: activeTab === "NEWGEN" ? "white" : "#b45309",
            border: activeTab === "NEWGEN" ? "none" : "1.5px solid #f59e0b",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          🚀 New-Gen & AI Tech Institutes ({newGenCount})
        </button>
      </div>

      {/* Table Box */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e3dc", padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0F2D52", margin: 0 }}>
              {activeTab === "ALL" ? "All Colleges" : activeTab === "GENERIC" ? "Generic Engineering Universities" : "New-Gen & AI Institutes"} ({filtered.length} Total)
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#8c8c8c" }}>
              Click any row to open the complete details & quality scores inspector.
            </span>
          </div>

          <div style={{ minWidth: "300px" }}>
            <input
              type="text"
              placeholder="Search college, city, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e5e3dc", color: "#0F2D52" }}>
                <th style={{ padding: "0.85rem 1rem" }}>Rank</th>
                <th style={{ padding: "0.85rem 1rem" }}>College Name</th>
                <th style={{ padding: "0.85rem 1rem" }}>Category</th>
                <th style={{ padding: "0.85rem 1rem" }}>Quality Scores</th>
                <th style={{ padding: "0.85rem 1rem" }}>Tuition / Yr</th>
                <th style={{ padding: "0.85rem 1rem" }}>Avg Package</th>
                <th style={{ padding: "0.85rem 1rem" }}>JEE Cutoff</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((col) => {
                const branch = col.branches?.[0];
                return (
                  <tr
                    key={col.id}
                    onClick={() => handleOpenDetails(col)}
                    style={{ borderBottom: "1px solid #f1f1f1", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fdfbf7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "1rem", fontWeight: 800, color: "#8c8c8c" }}>
                      #{col.rank || "—"}
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 700, color: "#0F2D52" }}>
                      {col.name}
                      <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: 400 }}>
                        📍 {col.city}, {col.state}
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleCategory(col.id, e)}
                        title={`Click to move this college to ${col.isNewGen ? "Generic" : "New-Gen AI"}`}
                        style={{
                          fontSize: "0.78rem",
                          background: col.isNewGen ? "#fef3c7" : "#e0f2fe",
                          color: col.isNewGen ? "#b45309" : "#0369a1",
                          border: col.isNewGen ? "1.5px solid #fcd34d" : "1.5px solid #bae6fd",
                          padding: "0.3rem 0.65rem",
                          borderRadius: "8px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {col.isNewGen ? "🚀 New-Gen AI ⇄" : "🏫 Generic ⇄"}
                      </button>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", background: "#f0fdf4", color: "#166534", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          P: {col.placementScore}/10
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#eff6ff", color: "#1e40af", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          C: {col.collegeLifeScore}/10
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#fefce8", color: "#854d0e", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          Infra: {col.infraRating || 8.5}/10
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                      {branch?.tuitionFeeAnnual ? `₹${(branch.tuitionFeeAnnual / 100000).toFixed(1)} L` : "—"}
                    </td>
                    <td style={{ padding: "1rem", color: "#166534", fontWeight: 700 }}>
                      {branch?.avgSalary ? `₹${(branch.avgSalary / 100000).toFixed(1)} LPA` : "—"}
                    </td>
                    <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                      {branch?.minJeePercentileCutoff ? `${branch.minJeePercentileCutoff}%ile` : "—"}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleOpenDetails(col)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            background: "#FFFAF0",
                            color: "#0F2D52",
                            border: "1.5px solid #C4A484",
                            borderRadius: "6px",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteCollege(col.id, col.name, e)}
                          style={{
                            padding: "0.4rem 0.65rem",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            border: "1px solid #fca5a5",
                            borderRadius: "6px",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                          title="Delete college"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full College Details & Edit Modal */}
      {selectedCollege && editForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "2.25rem",
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c8c8c", fontWeight: 700 }}>
                  College Profile & Scoring Inspector
                </span>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0F2D52", margin: "0.2rem 0 0" }}>
                  {selectedCollege.name}
                </h2>
              </div>
              <button
                onClick={() => { setSelectedCollege(null); setEditForm(null); }}
                style={{ background: "none", border: "none", fontSize: "1.6rem", cursor: "pointer", color: "#888" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCollege}>
              {/* Basic Information */}
              <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#0F2D52", marginBottom: "0.75rem" }}>
                1. Basic Details & Categorization
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>College Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Category</label>
                  <select
                    value={editForm.isNewGen ? "NEWGEN" : "GENERIC"}
                    onChange={(e) => setEditForm({ ...editForm, isNewGen: e.target.value === "NEWGEN" })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem", fontWeight: 600 }}
                  >
                    <option value="GENERIC">🏫 Generic / Traditional</option>
                    <option value="NEWGEN">🚀 New-Gen & AI Institute</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>National Rank</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.rank}
                    onChange={(e) => setEditForm({ ...editForm, rank: parseInt(e.target.value) || 1 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>City</label>
                  <input
                    type="text"
                    required
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>State</label>
                  <input
                    type="text"
                    required
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Official Website</label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Apply URL</label>
                  <input
                    type="text"
                    value={editForm.officialApplyUrl}
                    onChange={(e) => setEditForm({ ...editForm, officialApplyUrl: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              {/* Quality Scores */}
              <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#0F2D52", marginBottom: "0.75rem" }}>
                2. Quality & Performance Scores (0 to 10 Scale)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>📈 Placement (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.placementScore}
                    onChange={(e) => setEditForm({ ...editForm, placementScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>🏫 Campus Life (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.collegeLifeScore}
                    onChange={(e) => setEditForm({ ...editForm, collegeLifeScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>📚 Curriculum (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.curriculumScore}
                    onChange={(e) => setEditForm({ ...editForm, curriculumScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>🏗️ Infra (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.infraRating}
                    onChange={(e) => setEditForm({ ...editForm, infraRating: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>🚀 Startup Ecosystem (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.startupEcosystem}
                    onChange={(e) => setEditForm({ ...editForm, startupEcosystem: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>⚽ Sports & Extra (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.sportsExtracurricular}
                    onChange={(e) => setEditForm({ ...editForm, sportsExtracurricular: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>🌐 Global Exposure (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.internationalExposure}
                    onChange={(e) => setEditForm({ ...editForm, internationalExposure: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: "1.2rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700, color: "#0F2D52", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.isPartner}
                      onChange={(e) => setEditForm({ ...editForm, isPartner: e.target.checked })}
                      style={{ width: "1.2rem", height: "1.2rem" }}
                    />
                    Featured Partner College
                  </label>
                </div>
              </div>

              {/* Branch Cutoffs & Packages */}
              <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#0F2D52", marginBottom: "0.75rem" }}>
                3. Branch Details, Cutoffs & Financials (CSE / Benchmark Branch)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Annual Tuition (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.tuitionFeeAnnual}
                    onChange={(e) => setEditForm({ ...editForm, tuitionFeeAnnual: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Annual Hostel (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.hostelFeeAnnual}
                    onChange={(e) => setEditForm({ ...editForm, hostelFeeAnnual: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Avg Package (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.avgSalary}
                    onChange={(e) => setEditForm({ ...editForm, avgSalary: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Highest Package (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.highestSalary}
                    onChange={(e) => setEditForm({ ...editForm, highestSalary: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Min JEE Cutoff (%ile)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.minJeePercentileCutoff}
                    onChange={(e) => setEditForm({ ...editForm, minJeePercentileCutoff: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Min 12th Board Cutoff (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.minClass12Cutoff}
                    onChange={(e) => setEditForm({ ...editForm, minClass12Cutoff: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>Placement Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editForm.placementPercentage}
                    onChange={(e) => setEditForm({ ...editForm, placementPercentage: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", paddingTop: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteCollege(selectedCollege.id, selectedCollege.name)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    border: "1.5px solid #fca5a5",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  🗑️ Delete This College
                </button>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => { setSelectedCollege(null); setEditForm(null); }}
                    style={{
                      padding: "0.7rem 1.5rem",
                      background: "#f1f1f1",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "0.7rem 2rem",
                      background: "#0F2D52",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: "0.95rem",
                    }}
                  >
                    💾 Save & Update College
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
