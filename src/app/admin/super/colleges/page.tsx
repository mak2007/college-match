"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./colleges.module.css";

interface CollegeBranch {
  id: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: number;
  hostelFeeAnnual: number;
}

interface College {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  isPartner: boolean;
  commissionRate: number;
  placementScore: number;
  collegeLifeScore: number;
  curriculumScore: number;
  metadata: string | null; // JSON String
  branches: CollegeBranch[];
}

interface CustomAttr {
  key: string;
  label: string;
  defaultValue: number;
}

export default function SuperadminColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [customAttrs, setCustomAttrs] = useState<CustomAttr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  
  // Form States for Editing
  const [editName, setEditName] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editRate, setEditRate] = useState(0);
  const [editPlacements, setEditPlacements] = useState(0);
  const [editLife, setEditLife] = useState(0);
  const [editCurriculum, setEditCurriculum] = useState(0);
  const [editMetadata, setEditMetadata] = useState<Record<string, any>>({});
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load colleges and config
  useEffect(() => {
    async function loadData() {
      try {
        const [collegesRes, configRes] = await Promise.all([
          fetch("/api/admin/colleges"),
          fetch("/api/admin/config")
        ]);

        if (!collegesRes.ok || !configRes.ok) throw new Error("Failed to load data");

        const collegesData = await collegesRes.json();
        const configData = await configRes.json();

        setColleges(collegesData);
        setCustomAttrs(configData.customScoringAttributes || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load records. Check authentication.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectCollege = (col: College) => {
    setSelectedCollege(col);
    setEditName(col.name);
    setEditState(col.state);
    setEditCity(col.city);
    setEditRate(col.commissionRate);
    setEditPlacements(col.placementScore);
    setEditLife(col.collegeLifeScore);
    setEditCurriculum(col.curriculumScore);

    // Parse college metadata
    let meta: Record<string, any> = {};
    try {
      if (col.metadata) meta = JSON.parse(col.metadata);
    } catch (e) {
      console.warn(e);
    }
    
    // Ensure all active custom attributes are initialized
    const initialMeta: Record<string, any> = {};
    customAttrs.forEach(attr => {
      initialMeta[attr.key] = meta[attr.key] !== undefined ? meta[attr.key] : attr.defaultValue;
    });

    setEditMetadata(initialMeta);
    setMessage("");
    setError("");
  };

  const handleDeleteCollege = async (collegeId: string, collegeName: string) => {
    if (!confirm(`Are you sure you want to delete "${collegeName}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/colleges?collegeId=${collegeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete college");
      setColleges(colleges.filter(c => c.id !== collegeId));
      if (selectedCollege?.id === collegeId) setSelectedCollege(null);
      setMessage(`"${collegeName}" deleted successfully.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete college");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        collegeId: selectedCollege.id,
        name: editName,
        state: editState,
        city: editCity,
        commissionRate: editRate,
        placementScore: editPlacements,
        collegeLifeScore: editLife,
        curriculumScore: editCurriculum,
        metadata: editMetadata,
      };

      const res = await fetch("/api/admin/colleges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update college");

      // Update local state list
      setColleges(colleges.map(c => c.id === selectedCollege.id ? {
        ...c,
        name: editName,
        state: editState,
        city: editCity,
        commissionRate: editRate,
        placementScore: editPlacements,
        collegeLifeScore: editLife,
        curriculumScore: editCurriculum,
        metadata: JSON.stringify(editMetadata)
      } : c));

      setMessage("College attributes updated successfully!");
      setTimeout(() => setMessage(""), 3000);
      setSelectedCollege(null); // Close editor
    } catch (err: any) {
      setError(err.message || "Failed to save college");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading college registry...</div>;
  if (error && colleges.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className="glass-card text-center" style={{ maxWidth: "500px", margin: "5rem auto" }}>
          <h2>Access Denied</h2>
          <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>{error}</p>
          <Link href="/admin/login" className="btn btn-primary">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className={styles.title}>Colleges Registry & Ratings</h1>
            <p className={styles.subtitle}>Manage standard scores, commission rates, and custom attributes.</p>
          </div>
          <Link href="/admin/super/colleges/form" className="btn btn-primary glow-effect" style={{ whiteSpace: "nowrap" }}>
            + Add New College
          </Link>
        </div>

        {message && <div className={styles.successAlert}>✓ {message}</div>}
        {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

        <div className={styles.contentGrid}>
          {/* List of Colleges */}
          <section className="glass-card" style={{ flex: 1, minWidth: "350px" }}>
            <h3 className={styles.sectionTitle}>Onboarded Colleges</h3>
            <div className={styles.collegesList}>
              {colleges.map((col) => {
                let parsedMeta: Record<string, any> = {};
                try {
                  if (col.metadata) parsedMeta = JSON.parse(col.metadata);
                } catch (e) {}

                return (
                  <div 
                    key={col.id} 
                    className={`${styles.collegeItem} ${selectedCollege?.id === col.id ? styles.collegeItemActive : ""}`}
                    onClick={() => handleSelectCollege(col)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{col.name}</strong>
                      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <span className={styles.partnerBadge}>
                          {col.isPartner ? "Partner" : "Standard"}
                        </span>
                        <Link
                          href={`/admin/super/colleges/form?id=${col.id}`}
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "#e0efe9", borderRadius: "4px", color: "#065f46", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "#fee2e2", borderRadius: "4px", color: "#991b1b", border: "none", cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCollege(col.id, col.name); }}
                        >
                          Del
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      📍 {col.city}, {col.state} | Rate: ₹{col.commissionRate.toLocaleString("en-IN")}
                    </p>
                    <div className={styles.attributesRow} style={{ marginTop: "0.5rem" }}>
                      <span>Placement: {col.placementScore}</span>
                      <span>Life: {col.collegeLifeScore}</span>
                      <span>Curriculum: {col.curriculumScore}</span>
                      {Object.entries(parsedMeta).map(([key, val]) => (
                        <span key={key} className={styles.customAttrTag}>
                          {key}: {Number(val)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dynamic editor form */}
          {selectedCollege ? (
            <section className="glass-card" style={{ flex: 1.2, minWidth: "350px" }}>
              <h3 className={styles.sectionTitle}>Modify Attributes: {editName}</h3>
              <form onSubmit={handleSave} className={styles.form}>
                
                {/* Standard scores */}
                <h4 className={styles.subCardTitle}>Standard Scores (Scale 0-10)</h4>
                <div className="grid-3">
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Placements</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10"
                      value={editPlacements} 
                      onChange={(e) => setEditPlacements(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>College Life</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10"
                      value={editLife} 
                      onChange={(e) => setEditLife(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Curriculum</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10"
                      value={editCurriculum} 
                      onChange={(e) => setEditCurriculum(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                {/* Custom Metadata Attributes */}
                {customAttrs.length > 0 && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <h4 className={styles.subCardTitle}>Custom Schema-less Attributes</h4>
                    <div className="grid-2">
                      {customAttrs.map(attr => (
                        <div key={attr.key}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {attr.label} ({attr.key})
                          </label>
                          <input 
                            type="number" 
                            value={editMetadata[attr.key] !== undefined ? editMetadata[attr.key] : attr.defaultValue} 
                            onChange={(e) => setEditMetadata({
                              ...editMetadata,
                              [attr.key]: parseFloat(e.target.value) || 0
                            })}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Base fields */}
                <div style={{ marginTop: "1.5rem" }}>
                  <h4 className={styles.subCardTitle}>Location & Commission</h4>
                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>City</label>
                      <input 
                        type="text" 
                        value={editCity} 
                        onChange={(e) => setEditCity(e.target.value)} 
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Commission Rate (INR)</label>
                      <input 
                        type="number" 
                        value={editRate} 
                        onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)} 
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    {saving ? "Saving..." : "Save College Attributes"}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedCollege(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </section>
          ) : (
            <div className="glass-card flex-center text-center" style={{ flex: 1.2, minHeight: "300px", color: "var(--text-muted)" }}>
              Select a college from the registry listing to edit its standard scores and custom attributes.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
