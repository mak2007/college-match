"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import styles from "./import.module.css";

type ImportType = "colleges" | "branches" | "scholarships" | "admission_pathways";

interface ParsedRow {
  [key: string]: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
}

// ─── EXACT TEMPLATES (headers only + 2 sample rows) ──────────────
const TEMPLATES: Record<ImportType, string> = {
  colleges: [
    "name,state,city,officialApplyUrl,website,placementScore,collegeLifeScore,curriculumScore,isPartner,commissionRate,nirf_ranking,infra_rating,startup_ecosystem,research_output,international_exposure",
    "Vellore Institute of Technology,Tamil Nadu,Vellore,https://vit.ac.in/apply,https://vit.ac.in,9.2,8.8,9.0,true,25000,11,90,8.5,7.0,6.5",
    "Manipal Institute of Technology,Karnataka,Manipal,https://manipal.edu/apply,https://manipal.edu,8.9,9.6,8.7,true,30000,21,95,9.0,8.5,9.2",
  ].join("\n"),
  branches: [
    "collegeName,branchCode,branchName,tuitionFeeAnnual,hostelFeeAnnual,seatCapacity,avgSalary,medianSalary,highestSalary,minJeePercentileCutoff,minClass12Cutoff,branchStrengthScore,placementPercentage",
    "Vellore Institute of Technology,CSE,Computer Science & Engineering,198000,95000,1200,920000,850000,4400000,94.5,85.0,9.5,95.0",
    "Vellore Institute of Technology,ECE,Electronics & Communication Engineering,195000,95000,600,750000,700000,2200000,90.0,80.0,8.8,88.0",
  ].join("\n"),
  scholarships: [
    "collegeName,name,amountType,amount,description,isActive,criteria",
    "Vellore Institute of Technology,VIT Merit Scholarship,PERCENTAGE,25,Top 1% VITEEE rankers,true,rank<=1000",
    "Manipal Institute of Technology,Manipal Excellence Award,FIXED,50000,Rank holders in MIT entrance,true,rank<=500",
  ].join("\n"),
  admission_pathways: [
    "collegeName,branchCode,admissionExam,equivalentJeePercentile,admissionMode",
    "Vellore Institute of Technology,CSE,VITEEE,92.0,Entrance Exam",
    "Manipal Institute of Technology,CSE,MU-OET,90.0,Entrance Exam",
  ].join("\n"),
};

const SCHEMAS: Record<ImportType, { label: string; description: string; required: { field: string; note: string }[]; optional: { field: string; note: string }[] }> = {
  colleges: {
    label: "Colleges",
    description: "Import or update college records. Matched by college name (slug). Existing records are updated.",
    required: [
      { field: "name", note: "College name (unique)" },
      { field: "state", note: "Indian state" },
      { field: "city", note: "City name" },
    ],
    optional: [
      { field: "officialApplyUrl", note: "Application URL (defaults to example.com)" },
      { field: "website", note: "Official website" },
      { field: "placementScore", note: "0-10 scale" },
      { field: "collegeLifeScore", note: "0-10 scale" },
      { field: "curriculumScore", note: "0-10 scale" },
      { field: "isPartner", note: "true / false" },
      { field: "commissionRate", note: "Flat INR per referral" },
      { field: "nirf_ranking", note: "0-100 (inverse of rank)" },
      { field: "infra_rating", note: "0-100" },
      { field: "startup_ecosystem", note: "0-100" },
      { field: "research_output", note: "0-100" },
      { field: "international_exposure", note: "0-100" },
    ],
  },
  branches: {
    label: "Branches",
    description: "Import or update branch/program records. Matched by college name + branch code.",
    required: [
      { field: "collegeName", note: "Must match existing college name" },
      { field: "branchCode", note: "e.g. CSE, ECE, ME, IT" },
      { field: "branchName", note: "Full name" },
      { field: "tuitionFeeAnnual", note: "Annual tuition INR" },
      { field: "hostelFeeAnnual", note: "Annual hostel INR" },
    ],
    optional: [
      { field: "seatCapacity", note: "Total seats" },
      { field: "avgSalary", note: "Avg CTC in INR" },
      { field: "medianSalary", note: "Median CTC in INR" },
      { field: "highestSalary", note: "Highest CTC in INR" },
      { field: "minJeePercentileCutoff", note: "JEE percentile" },
      { field: "minClass12Cutoff", note: "Class 12 %" },
      { field: "branchStrengthScore", note: "0-10 (default 7)" },
      { field: "placementPercentage", note: "0-100" },
    ],
  },
  scholarships: {
    label: "Scholarships",
    description: "Import or update scholarship records. Matched by college name + scholarship name.",
    required: [
      { field: "collegeName", note: "Must match existing college" },
      { field: "name", note: "Scholarship name" },
      { field: "amount", note: "Amount in INR" },
    ],
    optional: [
      { field: "amountType", note: "FIXED / PERCENTAGE / TUITION_WAIVER" },
      { field: "description", note: "Short description" },
      { field: "isActive", note: "true (default) / false" },
      { field: "criteria", note: "Eligibility criteria text" },
    ],
  },
  admission_pathways: {
    label: "Admission Pathways",
    description: "Import or update admission pathway records. Matched by college + branch + exam.",
    required: [
      { field: "collegeName", note: "Must match existing college" },
      { field: "branchCode", note: "e.g. CSE, ECE" },
      { field: "admissionExam", note: "e.g. JEE Main, VITEEE, MU-OET" },
    ],
    optional: [
      { field: "equivalentJeePercentile", note: "Approx JEE percentile equivalent" },
      { field: "admissionMode", note: "e.g. Entrance Exam, Direct, Management" },
    ],
  },
};

const TAB_META: { key: ImportType; icon: string; label: string }[] = [
  { key: "colleges", icon: "🏫", label: "Colleges" },
  { key: "branches", icon: "📐", label: "Branches" },
  { key: "scholarships", icon: "🎓", label: "Scholarships" },
  { key: "admission_pathways", icon: "🚪", label: "Admission Pathways" },
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("colleges");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setParsedRows([]);
    setErrors([]);
    setResult(null);
    setFileName("");
  };

  const handleTabChange = (tab: ImportType) => {
    setActiveTab(tab);
    reset();
  };

  const parseRows = useCallback((rows: ParsedRow[]) => {
    const schema = SCHEMAS[activeTab];
    const errs: ValidationError[] = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      schema.required.forEach(({ field }) => {
        if (!String(row[field] ?? "").trim()) {
          errs.push({ row: rowNum, field, message: "Required" });
        }
      });
    });

    setParsedRows(rows);
    setErrors(errs);
  }, [activeTab]);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    setErrors([]);
    setResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: "" });
        parseRows(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (response) => parseRows(response.data as ParsedRow[]),
        error: (err) => setErrors([{ row: 0, field: "file", message: err.message }]),
      });
    }
  }, [parseRows]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, rows: parsedRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({
        success: false,
        totalRows: parsedRows.length,
        created: 0,
        updated: 0,
        skipped: parsedRows.length,
        errors: [{ row: 0, field: "api", message: msg }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATES[activeTab]], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateXlsx = () => {
    const rows = TEMPLATES[activeTab].split("\n").map((line) => {
      const vals = line.split(",");
      return vals;
    });
    const headers = rows[0];
    const data = rows.slice(1).map((vals) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SCHEMAS[activeTab].label);
    XLSX.writeFile(wb, `${activeTab}_template.xlsx`);
  };

  const schema = SCHEMAS[activeTab];
  const previewHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];
  const hasValidationErrors = errors.length > 0;
  const canImport = parsedRows.length > 0 && !importing && !hasValidationErrors;

  return (
    <div className={styles.wrapper}>
      <main className="container" style={{ maxWidth: "1100px" }}>
        <h1 className={styles.title}>Bulk Data Import</h1>
        <p className={styles.subtitle}>
          Upload CSV or XLSX files to import or update colleges, branches, scholarships, and admission pathways.
          Existing records are upserted by matching key fields.
        </p>

        {/* Tabs */}
        <div className={styles.tabs}>
          {TAB_META.map(({ key, icon, label }) => (
            <button
              key={key}
              className={`${styles.tab} ${activeTab === key ? styles.tabActive : ""}`}
              onClick={() => handleTabChange(key)}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Schema Reference */}
        <div className={styles.schemaSection}>
          <h3 className={styles.schemaTitle}>Spreadsheet Format — {schema.label}</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--light-text-secondary)", marginBottom: "1rem" }}>
            {schema.description}
          </p>
          <div className={styles.tableWrapper} style={{ maxHeight: "none" }}>
            <table className={styles.schemaTable}>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Required</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {schema.required.map(({ field, note }) => (
                  <tr key={field}>
                    <td><code>{field}</code></td>
                    <td><span className={styles.required}>Required</span></td>
                    <td style={{ color: "var(--light-text-secondary)" }}>{note}</td>
                  </tr>
                ))}
                {schema.optional.map(({ field, note }) => (
                  <tr key={field}>
                    <td><code>{field}</code></td>
                    <td><span className={styles.optional}>Optional</span></td>
                    <td style={{ color: "var(--light-text-secondary)" }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.uploadIcon}>📄</div>
          <div className={styles.uploadText}>
            {fileName ? `Selected: ${fileName}` : "Drop CSV or XLSX file here, or click to browse"}
          </div>
          <div className={styles.uploadHint}>Supports .csv, .xlsx, .xls (max 1000 rows)</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className={styles.uploadInput}
            onChange={handleFileChange}
          />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button className={styles.templateBtn} onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}>
              ⬇ CSV Template
            </button>
            <button className={styles.templateBtn} onClick={(e) => { e.stopPropagation(); downloadTemplateXlsx(); }}>
              ⬇ XLSX Template
            </button>
          </div>
        </div>

        {/* Validation Errors */}
        {hasValidationErrors && (
          <div className={styles.errorSection}>
            <div className="glass-card">
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-danger)", marginBottom: "1rem" }}>
                ⚠ {errors.length} Validation Error{errors.length !== 1 ? "s" : ""} (fix before importing)
              </h3>
              <div className={styles.errorList}>
                {errors.slice(0, 50).map((err, i) => (
                  <div key={i} className={styles.errorItem}>
                    <span className={styles.errorRow}>Row {err.row}</span>
                    <span className={styles.errorField}>{err.field}</span>
                    <span className={styles.errorMsg}>{err.message}</span>
                  </div>
                ))}
                {errors.length > 50 && (
                  <div style={{ fontSize: "0.8rem", color: "var(--light-text-secondary)", padding: "0.5rem 1rem" }}>
                    ...and {errors.length - 50} more errors
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {parsedRows.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>Data Preview</h3>
              <span className={styles.previewBadge}>{parsedRows.length} rows parsed</span>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr className={styles.dataRow}>
                    <th className={styles.dataHeader}>#</th>
                    {previewHeaders.map((h) => (
                      <th key={h} className={styles.dataHeader}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className={styles.dataRow}>
                      <td className={styles.dataCell}>{i + 2}</td>
                      {previewHeaders.map((h) => (
                        <td key={h} className={styles.dataCell}>{String(row[h] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                  {parsedRows.length > 20 && (
                    <tr className={styles.dataRow}>
                      <td className={styles.dataCell} colSpan={previewHeaders.length + 1} style={{ textAlign: "center", fontStyle: "italic" }}>
                        ...{parsedRows.length - 20} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        {parsedRows.length > 0 && (
          <div className={styles.actions}>
            <button
              className={styles.importBtn}
              onClick={handleImport}
              disabled={!canImport}
            >
              {importing ? "Importing..." : `Import ${parsedRows.length} Rows`}
            </button>
            <button className={styles.clearBtn} onClick={handleClear} disabled={importing}>
              Clear
            </button>
            {hasValidationErrors && (
              <span style={{ fontSize: "0.85rem", color: "var(--color-danger)" }}>
                Fix {errors.length} error{errors.length !== 1 ? "s" : ""} before importing
              </span>
            )}
          </div>
        )}

        {/* Import Result */}
        {result && (
          <div className={`${styles.resultCard} ${result.success ? styles.resultSuccess : result.created + result.updated > 0 ? styles.resultPartial : styles.resultError}`}>
            <h3 className={styles.resultTitle}>
              {result.success ? "✓ Import Complete" : result.created + result.updated > 0 ? "⚠ Partial Import" : "✗ Import Failed"}
            </h3>
            <div className={styles.resultStats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{result.totalRows}</span>
                <span className={styles.statLabel}>Total Rows</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue} style={{ color: "#22c55e" }}>{result.created}</span>
                <span className={styles.statLabel}>Created</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue} style={{ color: "#3b82f6" }}>{result.updated}</span>
                <span className={styles.statLabel}>Updated</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue} style={{ color: "#ef4444" }}>{result.skipped}</span>
                <span className={styles.statLabel}>Skipped</span>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Errors:</h4>
                <div className={styles.errorList}>
                  {result.errors.slice(0, 20).map((err, i) => (
                    <div key={i} className={styles.errorItem}>
                      <span className={styles.errorRow}>Row {err.row}</span>
                      <span className={styles.errorField}>{err.field}</span>
                      <span className={styles.errorMsg}>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
