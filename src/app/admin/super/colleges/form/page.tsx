"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./form.module.css";

interface BranchForm {
  id?: string;
  branchName: string;
  branchCode: string;
  tuitionFeeAnnual: string;
  hostelFeeAnnual: string;
  seatCapacity: string;
  avgSalary: string;
  medianSalary: string;
  highestSalary: string;
  minJeePercentileCutoff: string;
  minClass12Cutoff: string;
  branchStrengthScore: string;
  placementPercentage: string;
  metadata: Record<string, any>;
}

interface CollegeFormData {
  name: string;
  state: string;
  city: string;
  officialApplyUrl: string;
  website: string;
  logoUrl: string;
  coverImageUrl: string;
  brochureUrl: string;
  isPartner: boolean;
  commissionRate: string;
  placementScore: string;
  collegeLifeScore: string;
  curriculumScore: string;
  metadata: Record<string, any>;
  branches: BranchForm[];
}

const EMPTY_BRANCH: BranchForm = {
  branchName: "",
  branchCode: "",
  tuitionFeeAnnual: "",
  hostelFeeAnnual: "",
  seatCapacity: "",
  avgSalary: "",
  medianSalary: "",
  highestSalary: "",
  minJeePercentileCutoff: "",
  minClass12Cutoff: "",
  branchStrengthScore: "",
  placementPercentage: "",
  metadata: {},
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
  "Tamil Nadu", "Telangana", "Uttarakhand", "Uttar Pradesh", "West Bengal",
];

const CAREER_GOAL_META_KEYS = [
  { key: "startup_ecosystem", label: "Startup Ecosystem Score", desc: "0-100, strength of entrepreneurship support" },
  { key: "research_output", label: "Research Output Score", desc: "0-100, publications, patents, labs" },
  { key: "international_exposure", label: "International Exposure Score", desc: "0-100, exchange programs, global partnerships" },
];

const COMMON_CUSTOM_ATTRS = [
  { key: "nirf_ranking", label: "NIRF Ranking Score" },
  { key: "infra_rating", label: "Infrastructure Score" },
];

export default function CollegeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<CollegeFormData>({
    name: "",
    state: "",
    city: "",
    officialApplyUrl: "",
    website: "",
    logoUrl: "",
    coverImageUrl: "",
    brochureUrl: "",
    isPartner: false,
    commissionRate: "0",
    placementScore: "7",
    collegeLifeScore: "7",
    curriculumScore: "7",
    metadata: { nirf_ranking: 70, infra_rating: 70, startup_ecosystem: 50, research_output: 50, international_exposure: 50 },
    branches: [],
  });

  const [expandedBranch, setExpandedBranch] = useState<number | null>(null);

  // Load college data if editing
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetch("/api/admin/colleges")
      .then((res) => res.json())
      .then((colleges) => {
        const college = colleges.find((c: any) => c.id === editId);
        if (!college) {
          setError("College not found");
          return;
        }
        let meta: Record<string, any> = {};
        try { if (college.metadata) meta = JSON.parse(college.metadata); } catch {}

        setForm({
          name: college.name || "",
          state: college.state || "",
          city: college.city || "",
          officialApplyUrl: college.officialApplyUrl || "",
          website: college.website || "",
          logoUrl: college.logoUrl || "",
          coverImageUrl: college.coverImageUrl || "",
          brochureUrl: college.brochureUrl || "",
          isPartner: college.isPartner || false,
          commissionRate: String(college.commissionRate || 0),
          placementScore: String(college.placementScore || 7),
          collegeLifeScore: String(college.collegeLifeScore || 7),
          curriculumScore: String(college.curriculumScore || 7),
          metadata: {
            nirf_ranking: meta.nirf_ranking ?? 70,
            infra_rating: meta.infra_rating ?? 70,
            startup_ecosystem: meta.startup_ecosystem ?? 50,
            research_output: meta.research_output ?? 50,
            international_exposure: meta.international_exposure ?? 50,
          },
          branches: (college.branches || []).map((b: any) => {
            let branchMeta: Record<string, any> = {};
            try { if (b.metadata) branchMeta = JSON.parse(b.metadata); } catch {}
            return {
              id: b.id,
              branchName: b.branchName,
              branchCode: b.branchCode,
              tuitionFeeAnnual: String(b.tuitionFeeAnnual || 0),
              hostelFeeAnnual: String(b.hostelFeeAnnual || 0),
              seatCapacity: String(b.seatCapacity || 0),
              avgSalary: b.avgSalary ? String(b.avgSalary) : "",
              medianSalary: b.medianSalary ? String(b.medianSalary) : "",
              highestSalary: b.highestSalary ? String(b.highestSalary) : "",
              minJeePercentileCutoff: b.minJeePercentileCutoff ? String(b.minJeePercentileCutoff) : "",
              minClass12Cutoff: b.minClass12Cutoff ? String(b.minClass12Cutoff) : "",
              branchStrengthScore: String(b.branchStrengthScore || 7),
              placementPercentage: b.placementPercentage ? String(b.placementPercentage) : "",
              metadata: branchMeta,
            };
          }),
        });
      })
      .catch(() => setError("Failed to load college data"))
      .finally(() => setLoading(false));
  }, [editId]);

  const updateField = (field: keyof CollegeFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateMeta = (key: string, value: number) => {
    setForm((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const addBranch = () => {
    setForm((prev) => ({
      ...prev,
      branches: [...prev.branches, { ...EMPTY_BRANCH, metadata: {} }],
    }));
    setExpandedBranch(form.branches.length);
  };

  const removeBranch = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== idx),
    }));
    if (expandedBranch === idx) setExpandedBranch(null);
  };

  const updateBranch = (idx: number, field: keyof BranchForm, value: any) => {
    setForm((prev) => {
      const branches = [...prev.branches];
      (branches[idx] as any)[field] = value;
      return { ...prev, branches };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      if (isEdit) {
        // Update college
        const res = await fetch("/api/admin/colleges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collegeId: editId,
            name: form.name,
            state: form.state,
            city: form.city,
            officialApplyUrl: form.officialApplyUrl,
            website: form.website,
            logoUrl: form.logoUrl,
            coverImageUrl: form.coverImageUrl,
            brochureUrl: form.brochureUrl,
            isPartner: form.isPartner,
            commissionRate: form.commissionRate,
            placementScore: form.placementScore,
            collegeLifeScore: form.collegeLifeScore,
            curriculumScore: form.curriculumScore,
            metadata: form.metadata,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update college");
        }

        // Sync branches: update existing, create new, delete removed
        const existingBranchIds = form.branches.filter((b) => b.id).map((b) => b.id);
        const collegeData = await (await fetch("/api/admin/colleges")).json();
        const originalCollege = collegeData.find((c: any) => c.id === editId);
        const originalBranchIds = (originalCollege?.branches || []).map((b: any) => b.id);

        // Delete removed branches
        for (const origId of originalBranchIds) {
          if (!existingBranchIds.includes(origId)) {
            await fetch(`/api/admin/branches?branchId=${origId}`, { method: "DELETE" });
          }
        }

        // Create or update branches
        for (const branch of form.branches) {
          if (branch.id) {
            // Update existing
            await fetch("/api/admin/branches", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ branchId: branch.id, ...branch, id: undefined }),
            });
          } else {
            // Create new
            await fetch("/api/admin/branches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collegeId: editId, ...branch, id: undefined }),
            });
          }
        }

        setMessage("College updated successfully!");
      } else {
        // Create new college
        const res = await fetch("/api/admin/colleges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            state: form.state,
            city: form.city,
            officialApplyUrl: form.officialApplyUrl,
            website: form.website,
            logoUrl: form.logoUrl,
            coverImageUrl: form.coverImageUrl,
            brochureUrl: form.brochureUrl,
            isPartner: form.isPartner,
            commissionRate: form.commissionRate,
            placementScore: form.placementScore,
            collegeLifeScore: form.collegeLifeScore,
            curriculumScore: form.curriculumScore,
            metadata: form.metadata,
            branches: form.branches.map((b) => ({ ...b, id: undefined })),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create college");
        }
        setMessage("College created successfully!");
      }

      setTimeout(() => router.push("/admin/super/colleges"), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading college data...</div>;

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ padding: "3rem 1.5rem", maxWidth: "900px" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/admin/super/colleges" style={{ fontSize: "0.9rem", color: "var(--brand-blue)" }}>
            ← Back to Colleges Registry
          </Link>
          <h1 className={styles.title}>{isEdit ? "Edit College" : "Add New College"}</h1>
          <p className={styles.subtitle}>
            {isEdit ? "Update college details, scores, branches, and career-goal metadata." : "Fill in all details to onboard a new college."}
          </p>
        </div>

        {message && <div className={styles.successAlert}>✓ {message}</div>}
        {error && <div className={styles.errorAlert}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Basic Info */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>1. Basic Information</h3>
            <div className={styles.formGrid}>
              <div style={{ gridColumn: "span 2" }}>
                <label>College Name *</label>
                <input type="text" required value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Vellore Institute of Technology" />
              </div>
              <div>
                <label>State *</label>
                <select required value={form.state} onChange={(e) => updateField("state", e.target.value)}>
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>City *</label>
                <input type="text" required value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="e.g. Vellore" />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label>Official Apply URL *</label>
                <input type="url" required value={form.officialApplyUrl} onChange={(e) => updateField("officialApplyUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label>Website URL</label>
                <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* SECTION 2: Images */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>2. Media & Branding</h3>
            <div className={styles.formGrid}>
              <div>
                <label>Logo URL</label>
                <input type="url" value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label>Cover Image URL</label>
                <input type="url" value={form.coverImageUrl} onChange={(e) => updateField("coverImageUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label>Brochure URL</label>
                <input type="url" value={form.brochureUrl} onChange={(e) => updateField("brochureUrl", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* SECTION 3: Ranking Scores */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>3. Ranking Scores (0-10)</h3>
            <div className={styles.formGrid}>
              <div>
                <label>Placement Score</label>
                <input type="number" step="0.1" min="0" max="10" value={form.placementScore} onChange={(e) => updateField("placementScore", e.target.value)} />
              </div>
              <div>
                <label>College Life Score</label>
                <input type="number" step="0.1" min="0" max="10" value={form.collegeLifeScore} onChange={(e) => updateField("collegeLifeScore", e.target.value)} />
              </div>
              <div>
                <label>Curriculum Score</label>
                <input type="number" step="0.1" min="0" max="10" value={form.curriculumScore} onChange={(e) => updateField("curriculumScore", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECTION 4: Career-Goal Metadata */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>4. Career-Goal Metadata (0-100)</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              These scores influence recommendations for specific career goals (startup, research, abroad).
            </p>
            <div className={styles.formGrid}>
              {CAREER_GOAL_META_KEYS.map((item) => (
                <div key={item.key}>
                  <label>{item.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.metadata[item.key] ?? 50}
                    onChange={(e) => updateMeta(item.key, parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.desc}</span>
                </div>
              ))}
              {COMMON_CUSTOM_ATTRS.map((item) => (
                <div key={item.key}>
                  <label>{item.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.metadata[item.key] ?? 70}
                    onChange={(e) => updateMeta(item.key, parseInt(e.target.value) || 0)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: Commission & Partnership */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <h3 className={styles.sectionTitle}>5. Partnership & Commission</h3>
            <div className={styles.formGrid}>
              <div>
                <label>
                  <input type="checkbox" checked={form.isPartner} onChange={(e) => updateField("isPartner", e.target.checked)} style={{ marginRight: "0.5rem" }} />
                  Partner College
                </label>
              </div>
              <div>
                <label>Commission Rate (INR per referral)</label>
                <input type="number" min="0" value={form.commissionRate} onChange={(e) => updateField("commissionRate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECTION 6: Branches */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>6. Branches ({form.branches.length})</h3>
              <button type="button" className="btn btn-secondary" onClick={addBranch}>+ Add Branch</button>
            </div>

            {form.branches.length === 0 && (
              <p style={{ color: "var(--text-muted)", margin: "1rem 0", textAlign: "center" }}>
                No branches added yet. Click "Add Branch" to get started.
              </p>
            )}

            {form.branches.map((branch, idx) => (
              <div key={idx} style={{ border: "1px solid #e0ddd5", borderRadius: "8px", marginTop: "1rem", overflow: "hidden" }}>
                <div
                  style={{ padding: "0.75rem 1rem", background: expandedBranch === idx ? "#f0efe8" : "#faf9f6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => setExpandedBranch(expandedBranch === idx ? null : idx)}
                >
                  <strong>{branch.branchCode || `Branch ${idx + 1}`} — {branch.branchName || "Unnamed"}</strong>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={(e) => { e.stopPropagation(); removeBranch(idx); }}>Delete</button>
                    <span>{expandedBranch === idx ? "▲" : "▼"}</span>
                  </div>
                </div>

                {expandedBranch === idx && (
                  <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className={styles.formGrid}>
                      <div>
                        <label>Branch Name *</label>
                        <input type="text" required value={branch.branchName} onChange={(e) => updateBranch(idx, "branchName", e.target.value)} placeholder="e.g. Computer Science & Engineering" />
                      </div>
                      <div>
                        <label>Branch Code *</label>
                        <input type="text" required value={branch.branchCode} onChange={(e) => updateBranch(idx, "branchCode", e.target.value)} placeholder="e.g. CSE" />
                      </div>
                    </div>

                    <div className={styles.formGrid}>
                      <div>
                        <label>Annual Tuition Fee (INR) *</label>
                        <input type="number" required value={branch.tuitionFeeAnnual} onChange={(e) => updateBranch(idx, "tuitionFeeAnnual", e.target.value)} />
                      </div>
                      <div>
                        <label>Annual Hostel Fee (INR) *</label>
                        <input type="number" required value={branch.hostelFeeAnnual} onChange={(e) => updateBranch(idx, "hostelFeeAnnual", e.target.value)} />
                      </div>
                      <div>
                        <label>Seat Capacity *</label>
                        <input type="number" required value={branch.seatCapacity} onChange={(e) => updateBranch(idx, "seatCapacity", e.target.value)} />
                      </div>
                      <div>
                        <label>Branch Strength Score (0-10) *</label>
                        <input type="number" step="0.1" min="0" max="10" required value={branch.branchStrengthScore} onChange={(e) => updateBranch(idx, "branchStrengthScore", e.target.value)} />
                      </div>
                    </div>

                    <h4 style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Placement Data</h4>
                    <div className={styles.formGrid}>
                      <div>
                        <label>Avg Salary (INR)</label>
                        <input type="number" value={branch.avgSalary} onChange={(e) => updateBranch(idx, "avgSalary", e.target.value)} placeholder="e.g. 900000" />
                      </div>
                      <div>
                        <label>Median Salary (INR)</label>
                        <input type="number" value={branch.medianSalary} onChange={(e) => updateBranch(idx, "medianSalary", e.target.value)} />
                      </div>
                      <div>
                        <label>Highest Salary (INR)</label>
                        <input type="number" value={branch.highestSalary} onChange={(e) => updateBranch(idx, "highestSalary", e.target.value)} />
                      </div>
                      <div>
                        <label>Placement %</label>
                        <input type="number" step="0.1" min="0" max="100" value={branch.placementPercentage} onChange={(e) => updateBranch(idx, "placementPercentage", e.target.value)} />
                      </div>
                    </div>

                    <h4 style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Cutoff Scores</h4>
                    <div className={styles.formGrid}>
                      <div>
                        <label>Min JEE Percentile Cutoff</label>
                        <input type="number" step="0.1" value={branch.minJeePercentileCutoff} onChange={(e) => updateBranch(idx, "minJeePercentileCutoff", e.target.value)} />
                      </div>
                      <div>
                        <label>Min Class 12 Cutoff</label>
                        <input type="number" step="0.1" value={branch.minClass12Cutoff} onChange={(e) => updateBranch(idx, "minClass12Cutoff", e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <button type="submit" className="btn btn-primary glow-effect" style={{ flex: 1 }} disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update College" : "Create College"}
            </button>
            <Link href="/admin/super/colleges" className="btn btn-secondary" style={{ flex: 1, textAlign: "center" }}>
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
