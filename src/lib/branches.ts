// Centralized branch constants for CollegeMatch
// All branch codes, labels, and family mappings live here.

export interface BranchOption {
  code: string;
  label: string;
  shortLabel: string;
}

// ─── SUPPORTED BRANCHES (user-facing) ──────────────────────────────
// V1: CSE only. IT/ECE deferred to V2/V3. Keep family mappings active for normalization.
export const BRANCH_OPTIONS: BranchOption[] = [
  { code: "CSE", label: "Computer Science & Engineering (CSE)", shortLabel: "Computer Science" },
  // V2: uncomment when ready to re-enable
  // { code: "IT", label: "Information Technology (IT)", shortLabel: "Information Tech" },
  // V3: uncomment when ready to re-enable
  // { code: "ECE", label: "Electronics & Communication (ECE)", shortLabel: "Electronics & Comm" },
];

// All CSE variants that count as "CSE" for recommendation evaluation
export const CSE_VARIANTS = ["CSE", "CSE_CAT1", "CSE_CAT2", "CSE_CAT3", "CSE_CAT4"];

export const SUPPORTED_BRANCH_CODES = BRANCH_OPTIONS.map((b) => b.code);

// ─── BRANCH FAMILY MAPPINGS ───────────────────────────────────────
// Maps variant codes to their canonical supported code.
// E.g., "ISE" → "IT", "EIE" → "ECE"
const BRANCH_FAMILY_MAP: Record<string, string> = {
  // CSE family
  CSE: "CSE",
  CS: "CSE",
  CSEAIML: "CSE",
  CSE_AI_ML: "CSE",
  CSD: "CSE",
  CSBS: "CSE",

  // IT family
  IT: "IT",
  ISE: "IT", // Information Science & Engineering → IT

  // ECE family
  ECE: "ECE",
  EIE: "ECE", // Electronics & Instrumentation → ECE
};

// ─── NORMALIZATION FUNCTIONS ──────────────────────────────────────

/**
 * Normalize a branch code to its canonical form.
 * Maps variant codes (EEE, ISE, etc.) to supported codes (EE, IT, etc.).
 * Returns the canonical code if recognized, or the uppercased input if unknown.
 */
export function normalizeBranchCode(code: string): string {
  const upper = code.toUpperCase().replace(/[^A-Z]/g, "");
  return BRANCH_FAMILY_MAP[upper] || upper;
}

/**
 * Check if a branch code is a supported branch (after normalization).
 */
export function isSupportedBranch(code: string): boolean {
  return SUPPORTED_BRANCH_CODES.includes(normalizeBranchCode(code));
}

/**
 * Get the branch label for a code (supports variant codes).
 */
export function getBranchLabel(code: string): string {
  const canonical = normalizeBranchCode(code);
  const found = BRANCH_OPTIONS.find((b) => b.code === canonical);
  return found?.label || code;
}

/**
 * Get the short branch label for a code (supports variant codes).
 */
export function getBranchShortLabel(code: string): string {
  const canonical = normalizeBranchCode(code);
  const found = BRANCH_OPTIONS.find((b) => b.code === canonical);
  return found?.shortLabel || code;
}

/**
 * Normalize an array of branch codes to canonical forms.
 * Deduplicates after normalization.
 */
export function normalizeBranchCodes(codes: string[]): string[] {
  const normalized = codes.map(normalizeBranchCode);
  return [...new Set(normalized)];
}
