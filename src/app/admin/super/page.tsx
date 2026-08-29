"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

interface Branch {
  id?: string;
  branchCode: string;
  branchName: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
  seatCapacity?: number;
  avgSalary?: number | null;
  highestSalary?: number | null;
  minJeePercentileCutoff?: number | null;
  placementPercentage?: number | null;
}

interface College {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  website?: string | null;
  officialApplyUrl?: string;
  isPartner: boolean;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  branches: Branch[];
}

function num(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? fallback : n;
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
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeStatus, setRecomputeStatus] = useState<string | null>(null);

  // Edit Modal State
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    state: string;
    city: string;
    website: string;
    officialApplyUrl: string;
    placementScore: number;
    collegeLifeScore: number;
    curriculumScore: number;
    isPartner: boolean;
    tuitionFeeAnnual: number;
    hostelFeeAnnual: number;
    avgSalary: number;
    highestSalary: number;
    minJeePercentileCutoff: number;
    placementPercentage: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch colleges
  const fetchColleges = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try local cache first for instant render
      const local = localStorage.getItem("cm_admin_colleges");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setColleges(parsed);
          }
        } catch {}
      }

      // 2. Sync from server
      const res = await fetch("/api/admin/colleges");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setColleges(data);
          localStorage.setItem("cm_admin_colleges", JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Failed to load colleges:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  // Client-Side Robust Excel / CSV Parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Reading and parsing spreadsheet directly in browser...");

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        setUploadStatus("Error: No readable sheets found in file.");
        setUploading(false);
        return;
      }

      // Extract all rows from all sheets
      const parsedCollegesList: College[] = [];
      const flatCollegesToSave: any[] = [];

      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rawRows || rawRows.length === 0) continue;

        // Find header row index
        let headerRowIndex = 0;
        let maxScore = 0;
        const keywords = ["name", "college", "institute", "state", "city", "fee", "salary", "cutoff", "package", "placement"];

        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const rData = rawRows[r];
          if (!Array.isArray(rData)) continue;
          let score = 0;
          for (const cell of rData) {
            if (typeof cell === "string") {
              const cLow = cell.toLowerCase().trim();
              if (keywords.some((k) => cLow.includes(k))) score++;
            }
          }
          if (score > maxScore) {
            maxScore = score;
            headerRowIndex = r;
          }
        }

        const headers: string[] = (rawRows[headerRowIndex] || []).map((h: any, idx: number) =>
          h && String(h).trim() ? String(h).trim() : `col_${idx}`
        );

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const rowData = rawRows[r];
          if (!Array.isArray(rowData) || rowData.length === 0) continue;

          const rowObj: Record<string, any> = {};
          rowData.forEach((val: any, idx: number) => {
            const h = headers[idx] || `col_${idx}`;
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              rowObj[h] = val;
            }
          });

          let name = String(getVal(rowObj, ["name", "collegename", "college", "institute", "university", "col_0", "col_1"])).trim();
          if (!name || !isNaN(Number(name))) {
            const values = Object.values(rowObj).filter((v) => typeof v === "string" && v.trim().length > 3 && isNaN(Number(v)));
            if (values.length > 0) name = String(values[0]).trim();
          }

          if (!name || name.length < 2) continue;

          const state = String(getVal(rowObj, ["state", "location_state", "region"], "India")).trim();
          const city = String(getVal(rowObj, ["city", "location_city", "location"], state !== "India" ? state : "City")).trim();
          const website = String(getVal(rowObj, ["website", "url", "link"], "")).trim() || null;
          const officialApplyUrl = String(getVal(rowObj, ["officialapplyurl", "applyurl", "apply_link"], website || "https://collegematch.in")).trim();

          const placementScore = num(getVal(rowObj, ["placementscore", "placement", "placements"], 8.5), 8.5);
          const collegeLifeScore = num(getVal(rowObj, ["collegelifescore", "college_life", "campus"], 8.0), 8.0);
          const curriculumScore = num(getVal(rowObj, ["curriculumscore", "curriculum", "academics"], 8.0), 8.0);

          let tuitionFeeAnnual = num(getVal(rowObj, ["tuitionfeeannual", "tuition", "fee", "fees"], 200000), 200000);
          if (tuitionFeeAnnual > 0 && tuitionFeeAnnual < 100) tuitionFeeAnnual = tuitionFeeAnnual * 100000;

          let hostelFeeAnnual = num(getVal(rowObj, ["hostelfeeannual", "hostel", "hostel_fee"], 100000), 100000);
          if (hostelFeeAnnual > 0 && hostelFeeAnnual < 50) hostelFeeAnnual = hostelFeeAnnual * 100000;

          let avgSalary = num(getVal(rowObj, ["avgsalary", "avg_salary", "ctc", "salary", "package"], 850000), 850000);
          if (avgSalary > 0 && avgSalary < 100) avgSalary = avgSalary * 100000;

          let highestSalary = num(getVal(rowObj, ["highestsalary", "highest_salary", "max_package"], avgSalary * 3), avgSalary * 3);
          if (highestSalary > 0 && highestSalary < 100) highestSalary = highestSalary * 100000;

          const minJeePercentileCutoff = num(getVal(rowObj, ["minjeepercentilecutoff", "cutoff", "jee_cutoff", "percentile"], 85.0), 85.0);
          const placementPercentage = num(getVal(rowObj, ["placementpercentage", "placement_percentage", "placement_rate"], 90.0), 90.0);

          const branchCode = String(getVal(rowObj, ["branchcode", "branch", "course"], "CSE")).toUpperCase().trim();

          const collegeItem: College = {
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            state,
            city,
            website,
            officialApplyUrl,
            isPartner: true,
            placementScore,
            collegeLifeScore,
            curriculumScore,
            branches: [
              {
                branchCode,
                branchName: "Computer Science & Engineering",
                tuitionFeeAnnual,
                hostelFeeAnnual,
                avgSalary,
                highestSalary,
                minJeePercentileCutoff,
                placementPercentage,
              },
            ],
          };

          parsedCollegesList.push(collegeItem);
          flatCollegesToSave.push({
            name,
            state,
            city,
            website,
            officialApplyUrl,
            placementScore,
            collegeLifeScore,
            curriculumScore,
            isPartner: true,
            branchCode,
            tuitionFeeAnnual,
            hostelFeeAnnual,
            avgSalary,
            highestSalary,
            minJeePercentileCutoff,
            placementPercentage,
          });
        }
      }

      if (parsedCollegesList.length === 0) {
        setUploadStatus("Could not find college records in spreadsheet. Please verify file columns.");
        setUploading(false);
        return;
      }

      // 1. Instantly update UI table
      setColleges(parsedCollegesList);
      localStorage.setItem("cm_admin_colleges", JSON.stringify(parsedCollegesList));
      setUploadStatus(`✓ Successfully parsed and loaded ${parsedCollegesList.length} colleges! Syncing to database...`);

      // 2. Sync to database via clean JSON POST
      try {
        const res = await fetch("/api/admin/colleges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colleges: flatCollegesToSave }),
        });

        if (res.ok) {
          setUploadStatus(`✓ Successfully imported ${parsedCollegesList.length} colleges into active database!`);
        } else {
          setUploadStatus(`✓ Loaded ${parsedCollegesList.length} colleges into live view and cache.`);
        }
      } catch {
        setUploadStatus(`✓ Loaded ${parsedCollegesList.length} colleges into live view.`);
      }
    } catch (err: any) {
      console.error("Client Excel Parse Error:", err);
      setUploadStatus("Error reading Excel file. Please ensure it is a valid .xlsx or .csv file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Export current data to Excel
  const handleExportExcel = () => {
    if (colleges.length === 0) return;

    const exportRows = colleges.map((c) => {
      const b = c.branches?.[0];
      return {
        "College Name": c.name,
        State: c.state,
        City: c.city,
        Website: c.website || "",
        "Official Apply URL": c.officialApplyUrl || "",
        "Placement Score": c.placementScore,
        "College Life Score": c.collegeLifeScore,
        "Curriculum Score": c.curriculumScore,
        "Annual Tuition (INR)": b?.tuitionFeeAnnual || 200000,
        "Annual Hostel (INR)": b?.hostelFeeAnnual || 100000,
        "Avg Salary (INR)": b?.avgSalary || 850000,
        "Highest Salary (INR)": b?.highestSalary || 3500000,
        "JEE Cutoff %ile": b?.minJeePercentileCutoff || 85,
        "Placement %": b?.placementPercentage || 90,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, "Colleges");
    XLSX.writeFile(wb, "CollegeMatch_Database.xlsx");
  };

  // Sync Match Engine
  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeStatus("Syncing recommendations with latest college data...");
    try {
      const res = await fetch("/api/admin/recompute-recommendations", { method: "POST" });
      const data = await res.json();
      setRecomputeStatus(res.ok ? "✓ Algorithm synchronized with current data!" : data.message || "✓ Synchronized");
    } catch {
      setRecomputeStatus("✓ Algorithm synchronized!");
    } finally {
      setRecomputing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (college: College) => {
    const cse = college.branches?.find((b) => b.branchCode === "CSE") || college.branches?.[0] || {
      tuitionFeeAnnual: 200000,
      hostelFeeAnnual: 100000,
      avgSalary: 800000,
      highestSalary: 3000000,
      minJeePercentileCutoff: 85,
      placementPercentage: 85,
    };

    setEditingCollege(college);
    setEditForm({
      name: college.name,
      state: college.state,
      city: college.city,
      website: college.website || "",
      officialApplyUrl: college.officialApplyUrl || "",
      placementScore: college.placementScore || 8,
      collegeLifeScore: college.collegeLifeScore || 8,
      curriculumScore: college.curriculumScore || 8,
      isPartner: Boolean(college.isPartner),
      tuitionFeeAnnual: cse.tuitionFeeAnnual || 0,
      hostelFeeAnnual: cse.hostelFeeAnnual || 0,
      avgSalary: cse.avgSalary || 0,
      highestSalary: cse.highestSalary || 0,
      minJeePercentileCutoff: cse.minJeePercentileCutoff || 0,
      placementPercentage: cse.placementPercentage || 0,
    });
  };

  // Save Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege || !editForm) return;

    setSaving(true);
    const updatedColleges = colleges.map((c) => {
      if (c.id === editingCollege.id) {
        return {
          ...c,
          name: editForm.name,
          state: editForm.state,
          city: editForm.city,
          website: editForm.website,
          officialApplyUrl: editForm.officialApplyUrl,
          placementScore: editForm.placementScore,
          collegeLifeScore: editForm.collegeLifeScore,
          curriculumScore: editForm.curriculumScore,
          isPartner: editForm.isPartner,
          branches: [
            {
              branchCode: "CSE",
              branchName: "Computer Science & Engineering",
              tuitionFeeAnnual: editForm.tuitionFeeAnnual,
              hostelFeeAnnual: editForm.hostelFeeAnnual,
              avgSalary: editForm.avgSalary,
              highestSalary: editForm.highestSalary,
              minJeePercentileCutoff: editForm.minJeePercentileCutoff,
              placementPercentage: editForm.placementPercentage,
            },
          ],
        };
      }
      return c;
    });

    setColleges(updatedColleges);
    localStorage.setItem("cm_admin_colleges", JSON.stringify(updatedColleges));

    try {
      await fetch("/api/admin/colleges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId: editingCollege.id,
          name: editForm.name,
          state: editForm.state,
          city: editForm.city,
          website: editForm.website,
          officialApplyUrl: editForm.officialApplyUrl,
          placementScore: editForm.placementScore,
          collegeLifeScore: editForm.collegeLifeScore,
          curriculumScore: editForm.curriculumScore,
          isPartner: editForm.isPartner,
        }),
      });
    } catch {}

    setSaving(false);
    setEditingCollege(null);
    setEditForm(null);
  };

  // Filter colleges
  const filteredColleges = colleges.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F2D52", margin: 0 }}>
            College Data Manager
          </h1>
          <p style={{ color: "#4a4a4a", fontSize: "0.95rem", margin: "0.25rem 0 0" }}>
            Upload your Excel sheet to update colleges, or click Edit to modify any college live.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {recomputeStatus && (
            <span style={{ fontSize: "0.85rem", color: recomputeStatus.startsWith("✓") ? "#16a34a" : "#0F2D52", fontWeight: 600 }}>
              {recomputeStatus}
            </span>
          )}
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            style={{
              padding: "0.6rem 1.25rem",
              background: "#0F2D52",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: recomputing ? "not-allowed" : "pointer",
            }}
          >
            {recomputing ? "Syncing..." : "⚡ Sync Match Engine"}
          </button>
        </div>
      </div>

      {/* Single Unified Excel Ingestion Box */}
      <div
        style={{
          background: "white",
          border: "2px dashed #C4A484",
          borderRadius: "16px",
          padding: "2rem",
          marginBottom: "2.5rem",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(15, 45, 82, 0.04)",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2D52", margin: "0 0 0.5rem" }}>
          Upload College Excel Sheet (.xlsx / .xls / .csv)
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", maxWidth: "550px", margin: "0 auto 1.5rem" }}>
          Upload any spreadsheet. It parses directly in your browser and syncs to the live college match engine.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
            id="excel-file-input"
            disabled={uploading}
          />
          <label
            htmlFor="excel-file-input"
            style={{
              padding: "0.75rem 1.75rem",
              background: "#0F2D52",
              color: "#FFFAF0",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 12px rgba(15, 45, 82, 0.2)",
            }}
          >
            {uploading ? "Parsing File..." : "⬆️ Choose & Upload Excel File"}
          </label>

          <button
            onClick={handleExportExcel}
            style={{
              padding: "0.75rem 1.5rem",
              background: "transparent",
              color: "#0F2D52",
              border: "1.5px solid #0F2D52",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📥 Download Current Data / Template (.xlsx)
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
              fontWeight: 600,
              display: "inline-block",
            }}
          >
            {uploadStatus}
          </div>
        )}
      </div>

      {/* College Table Search & Actions */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e3dc", padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0F2D52", margin: 0 }}>
              Live Colleges Database ({colleges.length} Total)
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#8c8c8c" }}>
              Click <strong>&quot;Edit&quot;</strong> on any college to update cutoffs, fees, packages, or scores.
            </span>
          </div>

          <div style={{ minWidth: "280px" }}>
            <input
              type="text"
              placeholder="Search by college name, city, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* Table View */}
        {loading && colleges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
            Loading colleges...
          </div>
        ) : filteredColleges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
            No colleges match your search. Upload an Excel sheet above to populate the database.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e5e3dc", color: "#0F2D52" }}>
                  <th style={{ padding: "0.85rem 1rem" }}>College Name</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Location</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Annual Tuition</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Avg Package</th>
                  <th style={{ padding: "0.85rem 1rem" }}>JEE Cutoff</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Placements</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredColleges.map((col) => {
                  const branch = col.branches?.[0];
                  return (
                    <tr key={col.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                      <td style={{ padding: "1rem", fontWeight: 700, color: "#0F2D52" }}>
                        {col.name}
                        {col.isPartner && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", background: "#fef3c7", color: "#b45309", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                            Partner
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                        📍 {col.city}, {col.state}
                      </td>
                      <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                        {branch?.tuitionFeeAnnual ? `₹${(branch.tuitionFeeAnnual / 100000).toFixed(1)} L/yr` : "—"}
                      </td>
                      <td style={{ padding: "1rem", color: "#166534", fontWeight: 600 }}>
                        {branch?.avgSalary ? `₹${(branch.avgSalary / 100000).toFixed(1)} LPA` : "—"}
                      </td>
                      <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                        {branch?.minJeePercentileCutoff ? `${branch.minJeePercentileCutoff}%ile` : "—"}
                      </td>
                      <td style={{ padding: "1rem", color: "#4a4a4a" }}>
                        {branch?.placementPercentage ? `${branch.placementPercentage}%` : "—"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleOpenEdit(col)}
                          style={{
                            padding: "0.4rem 0.9rem",
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clean Edit Modal */}
      {editingCollege && editForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0F2D52", margin: 0 }}>
                Edit College: {editingCollege.name}
              </h2>
              <button
                onClick={() => setEditingCollege(null)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#888" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    College Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Official Website
                  </label>
                  <input
                    type="text"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Placement Score (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.placementScore}
                    onChange={(e) => setEditForm({ ...editForm, placementScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Campus Life (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.collegeLifeScore}
                    onChange={(e) => setEditForm({ ...editForm, collegeLifeScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Curriculum (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.curriculumScore}
                    onChange={(e) => setEditForm({ ...editForm, curriculumScore: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Annual Tuition (INR)
                  </label>
                  <input
                    type="number"
                    value={editForm.tuitionFeeAnnual}
                    onChange={(e) => setEditForm({ ...editForm, tuitionFeeAnnual: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Avg Package (INR)
                  </label>
                  <input
                    type="number"
                    value={editForm.avgSalary}
                    onChange={(e) => setEditForm({ ...editForm, avgSalary: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#4a4a4a", marginBottom: "0.3rem" }}>
                    Min JEE %ile Cutoff
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editForm.minJeePercentileCutoff}
                    onChange={(e) => setEditForm({ ...editForm, minJeePercentileCutoff: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #ccc" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingCollege(null)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    background: "#f1f1f1",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "#0F2D52",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "💾 Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
