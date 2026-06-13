"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./scholarships.module.css";

interface College {
  id: string;
  name: string;
}

interface Scholarship {
  id: string;
  collegeId: string;
  name: string;
  description: string | null;
  amountType: string;
  amount: number;
  criteria: string | null;
  isActive: boolean;
  createdAt: string;
  college: { id: string; name: string };
}

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCollegeId, setFormCollegeId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmountType, setFormAmountType] = useState("FIXED");
  const [formAmount, setFormAmount] = useState("");
  const [formCriteria, setFormCriteria] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [schRes, colRes] = await Promise.all([
          fetch("/api/admin/scholarships"),
          fetch("/api/admin/colleges"),
        ]);
        if (schRes.ok) setScholarships(await schRes.json());
        if (colRes.ok) {
          const cols = await colRes.json();
          setColleges(cols.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormCollegeId("");
    setFormName("");
    setFormDesc("");
    setFormAmountType("FIXED");
    setFormAmount("");
    setFormCriteria("");
    setFormActive(true);
    setShowForm(false);
  };

  const handleEdit = (s: Scholarship) => {
    setEditingId(s.id);
    setFormCollegeId(s.collegeId);
    setFormName(s.name);
    setFormDesc(s.description || "");
    setFormAmountType(s.amountType);
    setFormAmount(String(s.amount));
    setFormCriteria(s.criteria || "");
    setFormActive(s.isActive);
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete scholarship "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/scholarships?scholarshipId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setScholarships(scholarships.filter((s) => s.id !== id));
      setMessage("Scholarship deleted");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload: any = {
        collegeId: formCollegeId,
        name: formName,
        description: formDesc || null,
        amountType: formAmountType,
        amount: formAmount,
        criteria: formCriteria || null,
        isActive: formActive,
      };

      let res;
      if (editingId) {
        payload.scholarshipId = editingId;
        res = await fetch("/api/admin/scholarships", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/scholarships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      // Reload list
      const listRes = await fetch("/api/admin/scholarships");
      if (listRes.ok) setScholarships(await listRes.json());

      setMessage(editingId ? "Scholarship updated!" : "Scholarship created!");
      setTimeout(() => setMessage(""), 3000);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading scholarships...</div>;

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className={styles.title}>Scholarship Management</h1>
            <p className={styles.subtitle}>Create and manage scholarships offered by partner colleges.</p>
          </div>
          <button className="btn btn-primary glow-effect" onClick={() => { resetForm(); setShowForm(true); }}>
            + Add Scholarship
          </button>
        </div>

        {message && <div className={styles.successAlert}>✓ {message}</div>}
        {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

        {showForm && (
          <div className="glass-card" style={{ marginBottom: "2rem" }}>
            <h3 className={styles.sectionTitle}>{editingId ? "Edit Scholarship" : "New Scholarship"}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div>
                  <label>College *</label>
                  <select required value={formCollegeId} onChange={(e) => setFormCollegeId(e.target.value)}>
                    <option value="">-- Select College --</option>
                    {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Scholarship Name *</label>
                  <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Merit Scholarship 2026" />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label>Description</label>
                  <textarea rows={2} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description of the scholarship..." />
                </div>
                <div>
                  <label>Amount Type *</label>
                  <select value={formAmountType} onChange={(e) => setFormAmountType(e.target.value)}>
                    <option value="FIXED">Fixed Amount (INR)</option>
                    <option value="PERCENTAGE">Percentage of Tuition</option>
                    <option value="TUITION_WAIVER">Full Tuition Waiver</option>
                  </select>
                </div>
                <div>
                  <label>{formAmountType === "PERCENTAGE" ? "Percentage (%)" : "Amount (INR)"} *</label>
                  <input type="number" required min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label>Eligibility Criteria (JSON)</label>
                  <textarea rows={2} value={formCriteria} onChange={(e) => setFormCriteria(e.target.value)} placeholder='{"minJEE": 95, "maxFamilyIncome": 800000}' />
                </div>
                <div>
                  <label>
                    <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} style={{ marginRight: "0.5rem" }} />
                    Active
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="glass-card">
          <h3 className={styles.sectionTitle}>All Scholarships ({scholarships.length})</h3>
          {scholarships.length === 0 ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
              No scholarships created yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {scholarships.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid #e0ddd5", borderRadius: "8px" }}>
                  <div>
                    <strong>{s.name}</strong>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {s.college.name} | {s.amountType === "PERCENTAGE" ? `${s.amount}% off tuition` : s.amountType === "TUITION_WAIVER" ? "Full Tuition Waiver" : `₹${s.amount.toLocaleString("en-IN")}`}
                      {!s.isActive && <span style={{ color: "#991b1b", marginLeft: "0.5rem" }}>(Inactive)</span>}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }} onClick={() => handleEdit(s)}>
                      Edit
                    </button>
                    <button className="btn btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", color: "#991b1b" }} onClick={() => handleDelete(s.id, s.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
