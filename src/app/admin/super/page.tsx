"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

const DEFAULT_BASE_COLLEGES: College[] = [
  {
    id: "col_1",
    name: "Vellore Institute of Technology (VIT)",
    slug: "vit-vellore",
    state: "Tamil Nadu",
    city: "Vellore",
    website: "https://vit.ac.in",
    officialApplyUrl: "https://vit.ac.in/apply",
    isPartner: true,
    placementScore: 9.2,
    collegeLifeScore: 8.8,
    curriculumScore: 9.0,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 198000, hostelFeeAnnual: 95000, avgSalary: 920000, highestSalary: 4400000, minJeePercentileCutoff: 94.5, placementPercentage: 95.0 }],
  },
  {
    id: "col_2",
    name: "Manipal Institute of Technology (MIT)",
    slug: "mit-manipal",
    state: "Karnataka",
    city: "Manipal",
    website: "https://manipal.edu",
    officialApplyUrl: "https://manipal.edu/apply",
    isPartner: true,
    placementScore: 8.9,
    collegeLifeScore: 9.6,
    curriculumScore: 8.7,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 335000, hostelFeeAnnual: 110000, avgSalary: 1050000, highestSalary: 5400000, minJeePercentileCutoff: 91.0, placementPercentage: 93.0 }],
  },
  {
    id: "col_3",
    name: "BITS Pilani",
    slug: "bits-pilani",
    state: "Rajasthan",
    city: "Pilani",
    website: "https://bits-pilani.ac.in",
    officialApplyUrl: "https://bitsadmission.com",
    isPartner: false,
    placementScore: 9.8,
    collegeLifeScore: 9.2,
    curriculumScore: 9.8,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 540000, hostelFeeAnnual: 85000, avgSalary: 2150000, highestSalary: 6000000, minJeePercentileCutoff: 98.5, placementPercentage: 98.0 }],
  },
  {
    id: "col_4",
    name: "Thapar Institute of Engineering & Technology",
    slug: "thapar-patiala",
    state: "Punjab",
    city: "Patiala",
    website: "https://thapar.edu",
    officialApplyUrl: "https://thapar.edu/admissions",
    isPartner: true,
    placementScore: 8.8,
    collegeLifeScore: 9.0,
    curriculumScore: 8.6,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 385000, hostelFeeAnnual: 120000, avgSalary: 1120000, highestSalary: 4500000, minJeePercentileCutoff: 93.0, placementPercentage: 92.0 }],
  },
  {
    id: "col_5",
    name: "RV College of Engineering (RVCE)",
    slug: "rvce-bangalore",
    state: "Karnataka",
    city: "Bangalore",
    website: "https://rvce.edu.in",
    officialApplyUrl: "https://rvce.edu.in/admissions",
    isPartner: true,
    placementScore: 9.4,
    collegeLifeScore: 8.2,
    curriculumScore: 9.1,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 250000, hostelFeeAnnual: 100000, avgSalary: 1450000, highestSalary: 5200000, minJeePercentileCutoff: 96.0, placementPercentage: 96.0 }],
  },
  {
    id: "col_6",
    name: "SRM Institute of Science and Technology (KTR)",
    slug: "srm-ktr",
    state: "Tamil Nadu",
    city: "Chennai",
    website: "https://srmist.edu.in",
    officialApplyUrl: "https://applications.srmist.edu.in",
    isPartner: true,
    placementScore: 8.4,
    collegeLifeScore: 8.9,
    curriculumScore: 8.3,
    branches: [{ branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 300000, hostelFeeAnnual: 110000, avgSalary: 850000, highestSalary: 4200000, minJeePercentileCutoff: 88.0, placementPercentage: 90.0 }],
  },
];

function num(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? fallback : n;
}

export default function UnifiedCollegeManager() {
  const [colleges, setColleges] = useState<College[]>(DEFAULT_BASE_COLLEGES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState("");

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved colleges from cache or server on mount
  const fetchColleges = useCallback(async () => {
    try {
      const local = localStorage.getItem("cm_admin_colleges");
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
          localStorage.setItem("cm_admin_colleges", JSON.stringify(data));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  // Handle Excel/CSV File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("Parsing spreadsheet file...");

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const parsedColleges: College[] = [];

      wb.SheetNames.forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) return;

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rawRows || rawRows.length < 2) return;

        // Auto-detect header row
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const row = rawRows[r];
          if (Array.isArray(row) && row.some((c) => typeof c === "string" && (c.toLowerCase().includes("name") || c.toLowerCase().includes("college")))) {
            headerRowIdx = r;
            break;
          }
        }

        const headers = (rawRows[headerRowIdx] || []).map((h: any) => String(h || "").toLowerCase().trim());

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          const getCell = (keys: string[]) => {
            const idx = headers.findIndex((h) => keys.some((k) => h.includes(k)));
            return idx !== -1 && row[idx] !== undefined ? row[idx] : "";
          };

          let name = String(getCell(["name", "college", "institute", "university"])).trim();
          if (!name || !isNaN(Number(name))) {
            const strVal = row.find((cell) => typeof cell === "string" && cell.trim().length > 3 && isNaN(Number(cell)));
            if (strVal) name = String(strVal).trim();
          }

          if (!name || name.length < 2) continue;

          const state = String(getCell(["state", "region"])).trim() || "India";
          const city = String(getCell(["city", "location"])).trim() || "City";
          const website = String(getCell(["website", "url", "link"])).trim() || null;
          const officialApplyUrl = String(getCell(["apply", "admission"])).trim() || website || "https://collegematch.in";

          let tuition = num(getCell(["tuition", "fee", "fees"]), 200000);
          if (tuition > 0 && tuition < 100) tuition = tuition * 100000;

          let hostel = num(getCell(["hostel"]), 100000);
          if (hostel > 0 && hostel < 50) hostel = hostel * 100000;

          let avgSalary = num(getCell(["salary", "ctc", "package", "avg"]), 850000);
          if (avgSalary > 0 && avgSalary < 100) avgSalary = avgSalary * 100000;

          let maxSalary = num(getCell(["highest", "max"]), avgSalary * 3);
          if (maxSalary > 0 && maxSalary < 100) maxSalary = maxSalary * 100000;

          const cutoff = num(getCell(["cutoff", "jee", "percentile"]), 85.0);
          const placementPct = num(getCell(["placement", "rate"]), 90.0);

          parsedColleges.push({
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            state,
            city,
            website,
            officialApplyUrl,
            isPartner: true,
            placementScore: 8.5,
            collegeLifeScore: 8.0,
            curriculumScore: 8.0,
            branches: [
              {
                branchCode: "CSE",
                branchName: "Computer Science & Engineering",
                tuitionFeeAnnual: tuition,
                hostelFeeAnnual: hostel,
                avgSalary,
                highestSalary: maxSalary,
                minJeePercentileCutoff: cutoff,
                placementPercentage: placementPct,
              },
            ],
          });
        }
      });

      if (parsedColleges.length > 0) {
        setColleges(parsedColleges);
        localStorage.setItem("cm_admin_colleges", JSON.stringify(parsedColleges));
        setUploadStatus(`✓ Successfully imported ${parsedColleges.length} colleges into live database!`);
        
        // Sync to backend
        try {
          await fetch("/api/admin/colleges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ colleges: parsedColleges }),
          });
        } catch {}
      } else {
        setUploadStatus("Could not parse records. Try copying & pasting your spreadsheet directly below.");
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Error reading file. Try using the direct Paste option below.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Direct Paste from Excel (Ctrl+V)
  const handlePastedDataImport = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split(/\r?\n/);
    const parsedColleges: College[] = [];

    lines.forEach((line) => {
      const cells = line.split(/\t|,/).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (cells.length < 2) return;

      const name = cells[0];
      if (!name || name.toLowerCase().includes("name") || name.toLowerCase().includes("college")) return;

      const state = cells[1] || "India";
      const city = cells[2] || "City";
      const tuition = num(cells[3], 250000);
      const avgSalary = num(cells[4], 850000);
      const cutoff = num(cells[5], 85.0);

      parsedColleges.push({
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        state,
        city,
        isPartner: true,
        placementScore: 8.5,
        collegeLifeScore: 8.0,
        curriculumScore: 8.0,
        branches: [
          {
            branchCode: "CSE",
            branchName: "Computer Science & Engineering",
            tuitionFeeAnnual: tuition > 100 ? tuition : tuition * 100000,
            hostelFeeAnnual: 100000,
            avgSalary: avgSalary > 100 ? avgSalary : avgSalary * 100000,
            highestSalary: avgSalary * 3,
            minJeePercentileCutoff: cutoff,
            placementPercentage: 90,
          },
        ],
      });
    });

    if (parsedColleges.length > 0) {
      setColleges(parsedColleges);
      localStorage.setItem("cm_admin_colleges", JSON.stringify(parsedColleges));
      setUploadStatus(`✓ Successfully imported ${parsedColleges.length} colleges from pasted table!`);
      setPastedText("");
      setShowPasteBox(false);

      // Sync backend
      try {
        fetch("/api/admin/colleges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colleges: parsedColleges }),
        });
      } catch {}
    } else {
      setUploadStatus("Could not parse pasted rows. Please copy cells from Excel and paste again.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = colleges.map((c) => {
      const b = c.branches?.[0];
      return {
        "College Name": c.name,
        State: c.state,
        City: c.city,
        Website: c.website || "",
        "Annual Tuition (INR)": b?.tuitionFeeAnnual || 200000,
        "Annual Hostel (INR)": b?.hostelFeeAnnual || 100000,
        "Avg Salary (INR)": b?.avgSalary || 850000,
        "JEE Cutoff %ile": b?.minJeePercentileCutoff || 85,
        "Placement %": b?.placementPercentage || 90,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, "Colleges");
    XLSX.writeFile(wb, "CollegeMatch_Database.xlsx");
  };

  // Edit Modal Open
  const handleOpenEdit = (college: College) => {
    const cse = college.branches?.[0] || {
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
      placementScore: college.placementScore || 8.5,
      collegeLifeScore: college.collegeLifeScore || 8.0,
      curriculumScore: college.curriculumScore || 8.0,
      isPartner: Boolean(college.isPartner),
      tuitionFeeAnnual: cse.tuitionFeeAnnual || 0,
      hostelFeeAnnual: cse.hostelFeeAnnual || 0,
      avgSalary: cse.avgSalary || 0,
      highestSalary: cse.highestSalary || 0,
      minJeePercentileCutoff: cse.minJeePercentileCutoff || 0,
      placementPercentage: cse.placementPercentage || 0,
    });
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege || !editForm) return;

    const updated = colleges.map((c) => {
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

    setColleges(updated);
    localStorage.setItem("cm_admin_colleges", JSON.stringify(updated));
    setEditingCollege(null);
    setEditForm(null);
  };

  const filteredColleges = colleges.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0F2D52", margin: 0 }}>
            College Data Manager
          </h1>
          <p style={{ color: "#4a4a4a", fontSize: "0.95rem", margin: "0.25rem 0 0" }}>
            Upload spreadsheet, paste rows directly from Excel, or edit colleges below.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={() => {
              setColleges(DEFAULT_BASE_COLLEGES);
              localStorage.setItem("cm_admin_colleges", JSON.stringify(DEFAULT_BASE_COLLEGES));
              setUploadStatus("✓ Loaded standard baseline colleges.");
            }}
            style={{
              padding: "0.6rem 1rem",
              background: "#FFFAF0",
              color: "#0F2D52",
              border: "1.5px solid #0F2D52",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Reset to Standard Baseline
          </button>
        </div>
      </div>

      {/* Unified Ingestion Box */}
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
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📊</div>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2D52", margin: "0 0 0.5rem" }}>
          Feed College Data (Excel Upload or Copy-Paste)
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", maxWidth: "550px", margin: "0 auto 1.5rem" }}>
          Upload your Excel/CSV file or directly copy and paste rows from your spreadsheet.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
            id="excel-file-input"
          />
          <label
            htmlFor="excel-file-input"
            style={{
              padding: "0.75rem 1.5rem",
              background: "#0F2D52",
              color: "#FFFAF0",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 12px rgba(15, 45, 82, 0.2)",
            }}
          >
            📁 Choose & Upload Excel File
          </label>

          <button
            onClick={() => setShowPasteBox(!showPasteBox)}
            style={{
              padding: "0.75rem 1.5rem",
              background: showPasteBox ? "#0F2D52" : "#f4eee2",
              color: showPasteBox ? "#FFFAF0" : "#0F2D52",
              border: "1.5px solid #C4A484",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            📋 {showPasteBox ? "Hide Paste Box" : "Paste Rows Directly from Excel (Ctrl+V)"}
          </button>

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
            📥 Download Current Data (.xlsx)
          </button>
        </div>

        {/* Direct Paste Textarea */}
        {showPasteBox && (
          <div style={{ marginTop: "1.5rem", textAlign: "left", background: "#fdfbf7", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e5e3dc" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#0F2D52", marginBottom: "0.5rem" }}>
              Copy rows from Excel and Paste (Ctrl+V) directly here:
            </label>
            <textarea
              rows={5}
              placeholder="College Name&#9;State&#9;City&#9;Tuition Fee&#9;Avg Salary&#9;JEE Cutoff&#10;VIT Vellore&#9;Tamil Nadu&#9;Vellore&#9;198000&#9;920000&#9;94.5"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
            <button
              onClick={handlePastedDataImport}
              style={{
                marginTop: "0.75rem",
                padding: "0.6rem 1.5rem",
                background: "#0F2D52",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✓ Process Pasted Rows
            </button>
          </div>
        )}

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
              Live Colleges Database ({colleges.length} Loaded)
            </h3>
            <span style={{ fontSize: "0.85rem", color: "#8c8c8c" }}>
              Click <strong>&quot;Edit&quot;</strong> on any college to update cutoffs, fees, packages, or scores.
            </span>
          </div>

          <div style={{ minWidth: "280px" }}>
            <input
              type="text"
              placeholder="Search college, city, or state..."
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
      </div>

      {/* Edit Modal */}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
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
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "#0F2D52",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
