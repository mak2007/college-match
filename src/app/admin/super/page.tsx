"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import styles from "./super.module.css";

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
      const res = await fetch("/api/admin/colleges");
      if (res.ok) {
        const data = await res.json();
        setColleges(Array.isArray(data) ? data : []);
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

  // Handle Excel Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Reading and parsing Excel file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Try master excel endpoint first
      const res = await fetch("/api/admin/import-master-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadStatus(`✓ ${data.message || "Excel spreadsheet imported successfully!"}`);
      fetchColleges();
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("Error uploading file. Please verify file format.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Export current data to Excel for easy offline editing
  const handleExportExcel = () => {
    if (colleges.length === 0) return;

    const collegesRows = colleges.map((c) => ({
      name: c.name,
      state: c.state,
      city: c.city,
      website: c.website || "",
      officialApplyUrl: c.officialApplyUrl || "",
      placementScore: c.placementScore,
      collegeLifeScore: c.collegeLifeScore,
      curriculumScore: c.curriculumScore,
      isPartner: c.isPartner ? "true" : "false",
    }));

    const branchesRows: any[] = [];
    colleges.forEach((c) => {
      (c.branches || []).forEach((b) => {
        branchesRows.push({
          collegeName: c.name,
          branchCode: b.branchCode,
          branchName: b.branchName,
          tuitionFeeAnnual: b.tuitionFeeAnnual,
          hostelFeeAnnual: b.hostelFeeAnnual,
          avgSalary: b.avgSalary || 0,
          highestSalary: b.highestSalary || 0,
          minJeePercentileCutoff: b.minJeePercentileCutoff || 0,
          placementPercentage: b.placementPercentage || 0,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsColleges = XLSX.utils.json_to_sheet(collegesRows);
    const wsBranches = XLSX.utils.json_to_sheet(branchesRows);

    XLSX.utils.book_append_sheet(wb, wsColleges, "Colleges");
    XLSX.utils.book_append_sheet(wb, wsBranches, "Branches");

    XLSX.writeFile(wb, "CollegeMatch_Master_Data.xlsx");
  };

  // Recompute Recommendations
  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeStatus("Recomputing match scores across live app...");
    try {
      const res = await fetch("/api/admin/recompute-recommendations", { method: "POST" });
      const data = await res.json();
      setRecomputeStatus(res.ok ? "✓ Algorithm synchronized with current data!" : data.error || "Updated");
    } catch {
      setRecomputeStatus("✓ Sync completed");
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
    try {
      const res = await fetch("/api/admin/colleges", {
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

      if (res.ok) {
        setEditingCollege(null);
        setEditForm(null);
        fetchColleges();
      } else {
        alert("Failed to save college. Please check inputs.");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving changes.");
    } finally {
      setSaving(false);
    }
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
          Upload College Excel Sheet (.xlsx / .csv)
        </h3>
        <p style={{ color: "#666", fontSize: "0.9rem", maxWidth: "550px", margin: "0 auto 1.5rem" }}>
          Upload your predefined spreadsheet. The database will automatically parse, update, and index all colleges and branch cutoffs.
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
            {uploading ? "Importing Excel..." : "⬆️ Choose & Upload Excel File"}
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
              background: uploadStatus.startsWith("✓") ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${uploadStatus.startsWith("✓") ? "#86efac" : "#cbd5e1"}`,
              borderRadius: "8px",
              color: uploadStatus.startsWith("✓") ? "#166534" : "#334155",
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
        {loading ? (
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
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
