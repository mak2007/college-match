# CollegeMatch Recommendation Engine — V1 Specification

> **Status:** Draft for Review  
> **Date:** 2026-06-10  
> **Goal:** Freeze all inputs, filters, ranking factors, and data requirements before coding the database schema and algorithm.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Filters (Hard Eliminations)](#2-filters-hard-eliminations)
3. [Ranking Factors (Soft Scoring)](#3-ranking-factors-soft-scoring)
4. [Student Personas](#4-student-personas)
5. [Quiz Questions](#5-quiz-questions)
6. [College Data Fields](#6-college-data-fields)
7. [Field Usage Matrix](#7-field-usage-matrix)
8. [Scoring Pipeline](#8-scoring-pipeline)
9. [Edge Cases & Rules](#9-edge-cases--rules)
10. [Gaps & Proposed V1 Additions](#10-gaps--proposed-v1-additions)

---

## 1. System Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│  Quiz Input  │────▶│   Filters    │────▶│  Scoring Engine  │────▶│  Results │
│  (Student)   │     │ (Eliminate)  │     │  (Rank Survivors)│     │ (Ranked) │
└─────────────┘     └──────────────┘     └──────────────────┘     └──────────┘
```

**Pipeline stages:**
1. Student answers quiz questions (exam, rank, budget, location, priorities, branch)
2. **Filters** eliminate ineligible colleges
3. **Ranking** scores surviving colleges on weighted dimensions
4. **Bonuses/Penalties** adjust final score
5. Results sorted by final score, top N returned with explanations

---

## 2. Filters (Hard Eliminations)

Filters **remove** colleges from consideration entirely. A college that fails any filter is excluded from results — it gets a score of 0 and is never shown.

### F1 — Location Filter
| Property | Value |
|----------|-------|
| **Input** | `student.restrictLocation` (boolean), `student.preferredLocations[]` (state, city) |
| **Logic** | If `restrictLocation = true`, college must match at least one preferred `(state, city)` pair. City match is optional (state-only filtering supported). |
| **Eliminates** | Colleges outside preferred geography |
| **Current Status** | IMPLEMENTED (Stage 1 in engine) |

### F2 — Budget Ceiling Filter
| Property | Value |
|----------|-------|
| **Input** | `student.budgetLimit` (annual INR), `student.isBudgetConstraint` (boolean), `config.budgetPenalty.thresholdMultiplier` (default 1.3) |
| **Logic** | If budget constraint active: `total4YearCost > budgetLimit × thresholdMultiplier` → ELIMINATE. Total cost = `(tuitionFeeAnnual + hostelFeeAnnual) × 4`. |
| **Eliminates** | Colleges whose total 4-year cost exceeds budget ceiling |
| **Current Status** | IMPLEMENTED (Stage 2 in engine) |

### F3 — Academic Eligibility Filter
| Property | Value |
|----------|-------|
| **Input** | `student.jeePercentile`, `student.class12Percentage`, `college.minJeePercentileCutoff`, `college.minClass12Cutoff`, `config.academicCompetitiveness.excludeLimit` (default -15) |
| **Logic** | `bestGap = max(jeeGap, c12Gap)` where `jeeGap = student.jeePercentile - branch.minJeePercentileCutoff`. If `bestGap < excludeLimit` → ELIMINATE. |
| **Eliminates** | Colleges where student's academic profile is far below cutoff |
| **Current Status** | IMPLEMENTED (Stage 3 in engine) |

### F4 — Branch Availability Filter (Implicit)
| Property | Value |
|----------|-------|
| **Input** | `student.preferredBranches[]` |
| **Logic** | Only colleges that offer at least one of the student's preferred branches are included as candidates. This happens at the data-fetching level (API queries branches matching student's preferred codes). |
| **Eliminates** | Colleges that don't offer any of the student's desired branches |
| **Current Status** | PARTIALLY IMPLEMENTED — happens in API route, not in engine |

---

## 3. Ranking Factors (Soft Scoring)

Ranking factors assign a **score** (0–100) to each surviving college. Each factor is multiplied by a weight, summed, then adjusted by bonuses/penalties.

### 3.1 Core Ranking Dimensions

These are the 5 dimensions the student directly ranks in the quiz.

#### R1 — Placements
| Property | Value |
|----------|-------|
| **Source Field** | `college.placementScore` (0–10 scale) |
| **Normalization** | `score = placementScore × 10` (maps to 0–100) |
| **Weight Config Key** | `PLACEMENTS` |
| **Label** | "Placement outcomes" |
| **What It Measures** | Overall placement quality (aggregate of package, percentage placed, recruiter quality) |
| **Current Status** | IMPLEMENTED |

#### R2 — ROI (Return on Investment)
| Property | Value |
|----------|-------|
| **Source Fields** | `branch.avgSalary`, `branch.tuitionFeeAnnual` |
| **Normalization** | Min-max across all candidates: `30 + ((ratio - minRoi) / range) × 70` where `ratio = avgSalary / (tuitionFeeAnnual × 4)` |
| **Weight Config Key** | `ROI` |
| **Label** | "Return on Investment (ROI)" |
| **What It Measures** | How much salary回报 a student gets per rupee spent on tuition |
| **Current Status** | IMPLEMENTED |

#### R3 — Branch Strength
| Property | Value |
|----------|-------|
| **Source Field** | `branch.branchStrengthScore` (0–10 scale) |
| **Normalization** | `score = branchStrengthScore × 10` (maps to 0–100) |
| **Weight Config Key** | `BRANCH_STRENGTH` |
| **Label** | "{branchCode} department strength" |
| **What It Measures** | How strong the specific branch/department is at this college (faculty, labs, research, industry connect) |
| **Current Status** | IMPLEMENTED |

#### R4 — College Life
| Property | Value |
|----------|-------|
| **Source Field** | `college.collegeLifeScore` (0–10 scale) |
| **Normalization** | `score = collegeLifeScore × 10` (maps to 0–100) |
| **Weight Config Key** | `COLLEGE_LIFE` |
| **Label** | "Campus life & hostels" |
| **What It Measures** | Campus infrastructure, hostel quality, clubs, events, student culture |
| **Current Status** | IMPLEMENTED |

#### R5 — Curriculum
| Property | Value |
|----------|-------|
| **Source Field** | `college.curriculumScore` (0–10 scale) |
| **Normalization** | `score = curriculumScore × 10` (maps to 0–100) |
| **Weight Config Key** | `CURRICULUM` |
| **Label** | "Curriculum & Faculty standards" |
| **What It Measures** | Academic curriculum quality, syllabus relevance, faculty credentials |
| **Current Status** | IMPLEMENTED |

### 3.2 Custom Scoring Attributes (Admin-Configurable)

These are additional dimensions that admins can define. They read from the `college.metadata` JSON field.

| Property | Value |
|----------|-------|
| **Source Field** | `college.metadata` (JSON) |
| **Config** | `config.customScoringAttributes[]` — each has `key`, `label`, `weight`, `defaultValue` |
| **Normalization** | Raw value from metadata, clamped to 0–100 |
| **Current Defaults** | `nirf_ranking` (weight 0.05, default 70), `infra_rating` (weight 0.05, default 80) |
| **Current Status** | IMPLEMENTED |

### 3.3 Weight Strategies

The engine supports 3 ways to assign weights to the 5 core dimensions:

| Strategy | Logic | Behavior |
|----------|-------|----------|
| **ROC** (Rank-Order Centroid) | Student ranks priorities 1–5. Position 1 gets 0.4567, position 2 gets 0.2567, etc. | Dynamic — changes per student based on their priority order |
| **EQUAL** | All 5 core dimensions get 0.20 each | Static — ignores student priorities |
| **MANUAL** | Admin sets exact weights via config | Static — admin override |

**Weight normalization:** All weights (core + custom) are scaled to sum to exactly 1.0.

---

## 4. Bonuses & Penalties (Score Adjustments)

### 4.1 Bonuses (Additive)

| Bonus Type | Condition | Value | Current Status |
|------------|-----------|-------|----------------|
| **IS_PARTNER** | `college.isPartner === true` | +2.0 points | IMPLEMENTED |
| **PLACEMENT_AVERAGE** | `branch.avgSalary ≥ threshold` (default ₹9L) | +5.0 points | IMPLEMENTED |
| **CUSTOM_ATTRIBUTE** | `college.metadata[key] ≥ threshold` | Configurable | IMPLEMENTED |

### 4.2 Penalties (Subtractive)

| Penalty Type | Condition | Formula | Current Status |
|--------------|-----------|---------|----------------|
| **Budget Overrun** | `total4YearCost > budgetLimit` but `< threshold` | `((cost - limit) / range) ^ exponent × baseWeight` | IMPLEMENTED |
| **Academic Unlikely** | `bestGap` between `unlikelyThreshold` and `excludeLimit` | `abs(gap) × unlikelyPenaltyScale` | IMPLEMENTED |
| **Academic Reach** | `bestGap` between `reachThreshold` and `unlikelyThreshold` | `abs(gap) × reachPenaltyScale` | IMPLEMENTED |

### 4.3 Academic Competitiveness Categories

| Category | Condition | Badge | Penalty |
|----------|-----------|-------|---------|
| **Safe** | `bestGap ≥ safeThreshold` (default 5.0) | "Competitiveness: Safe" | None |
| **Target** | `bestGap` between `reachThreshold` and `safeThreshold` | "Good Fit" | None |
| **Reach** | `bestGap` between `unlikelyThreshold` and `reachThreshold` | "Competitiveness: Reach" | `abs(gap) × reachPenaltyScale` |
| **Unlikely** | `bestGap` between `excludeLimit` and `unlikelyThreshold` | "Competitiveness: Unlikely" | `abs(gap) × unlikelyPenaltyScale` |
| **Excluded** | `bestGap < excludeLimit` (default -15) | Not shown | FILTERED OUT |

---

## 5. Student Personas

These are the target student archetypes. Each persona drives different quiz defaults, weight strategies, and filter settings.

### P1 — "The Ranker"
| Attribute | Value |
|-----------|-------|
| **Description** | High JEE percentile (90+), focused on top-tier colleges, willing to pay premium |
| **Typical Budget** | ₹15L–₹30L |
| **Priority Order** | Placements > ROI > Branch Strength > Curriculum > College Life |
| **Location Preference** | Flexible (all India) |
| **Branch Preference** | CSE/IT at top colleges |
| **Budget Constraint** | Low (willing to stretch) |
| **Quiz Behavior** | Selects JEE exam, enters high rank, sets wide location, high budget |

### P2 — "The Value Seeker"
| Attribute | Value |
|-----------|-------|
| **Description** | Mid-range rank (70–90 percentile), wants best placement per rupee spent |
| **Typical Budget** | ₹8L–₹15L |
| **Priority Order** | ROI > Placements > College Life > Branch Strength > Curriculum |
| **Location Preference** | Moderate (2–3 states) |
| **Branch Preference** | CSE/ECE |
| **Budget Constraint** | High (strict limit) |
| **Quiz Behavior** | Sets strict budget, ranks ROI #1, filters by nearby states |

### P3 — "The Campus Dreamer"
| Attribute | Value |
|-----------|-------|
| **Description** | Moderate rank, values campus life, hostel quality, and student culture over pure placement numbers |
| **Typical Budget** | ₹10L–₹20L |
| **Priority Order** | College Life > Placements > Curriculum > Branch Strength > ROI |
| **Location Preference** | Specific city (e.g., Bangalore, Pune) |
| **Branch Preference** | Any (flexible) |
| **Budget Constraint** | Moderate |
| **Quiz Behavior** | Ranks campus life #1, may select specific city |

### P4 — "The Branch Purist"
| Attribute | Value |
|-----------|-------|
| **Description** | Very specific about branch (e.g., only CSE), rank varies, will go to any college that has their preferred branch |
| **Typical Budget** | Varies |
| **Priority Order** | Branch Strength > Placements > ROI > Curriculum > College Life |
| **Location Preference** | Flexible |
| **Branch Preference** | Single branch only (CSE) |
| **Budget Constraint** | Varies |
| **Quiz Behavior** | Selects only 1 branch, ranks branch strength #1 |

### P5 — "The Local Student"
| Attribute | Value |
|-----------|-------|
| **Description** | Wants to study in home state/city, limited by location, mid-range everything |
| **Typical Budget** | ₹5L–₹12L |
| **Priority Order** | Placements > College Life > ROI > Branch Strength > Curriculum |
| **Location Preference** | Strict (home state only) |
| **Branch Preference** | CSE/IT/ECE |
| **Budget Constraint** | High |
| **Quiz Behavior** | Enables location filter, selects specific state/city |

### P6 — "The Explorer"
| Attribute | Value |
|-----------|-------|
| **Description** | No strong preferences, wants the engine to suggest options. Often early in the exploration phase. |
| **Typical Budget** | Unknown |
| **Priority Order** | Equal (no strong preference) |
| **Location Preference** | All India |
| **Branch Preference** | Multiple |
| **Budget Constraint** | Unknown |
| **Quiz Behavior** | May skip questions, selects "All India", equal priority strategy |

---

## 6. Quiz Questions

### Current Quiz Flow (Predictor — `/predict`)

| Step | Question | Input Type | Values | Maps To |
|------|----------|------------|--------|---------|
| 1 | Which exam did you appear for? | Card select | JEE Main, COMEDK, KCET, MHT-CET, WBJEE, AP EAPCET, TS EAMCET, Bitsat, VITEEE, Other | `examType` |
| 2 | What is your JEE All India percentile? | Slider | 0–100 | `student.jeePercentile` |
| 3 | What is your Class 12 percentage? | Slider | 0–100 | `student.class12Percentage` |
| 4 | Which states are you open to? | Multi-select chips | All Indian states | `student.preferredLocations` |
| 5 | Rank your priorities (drag & drop) | Ordered list | Placements, ROI, Branch Strength, College Life, Curriculum, Extracurriculars, Research | `student.priorities[]` |
| 6 | What is your annual budget? | Slider | ₹5L–₹30L | `student.budgetLimit` |
| 7 | Enforce budget strictly? | Toggle | Yes/No | `student.isBudgetConstraint` |
| 8 | Which branches interest you? | Multi-select cards | CSE, IT, ECE, ME, CE | `student.preferredBranches[]` |

### Current Quiz Flow (Wizard — `/wizard`)

| Step | Question | Input Type | Values | Maps To |
|------|----------|------------|--------|---------|
| 1 | Location preferences | State/city dropdown | 10 hardcoded cities | `student.preferredLocations` |
| 2 | Budget | Slider | ₹4L–₹30L | `student.budgetLimit` |
| 3 | Academic scores | Inputs | JEE percentile, Class 12 % | `student.jeePercentile`, `student.class12Percentage` |
| 4 | Branch selection | Multi-select | CSE, IT, ECE, ME, CE | `student.preferredBranches[]` |
| 5 | Priority ranking | Reorderable list | 5 core criteria | `student.priorities[]` |
| 6 | Contact info | Form | Name, email, phone | `student.name`, `student.email`, `student.phone` |

### Proposed V1 Quiz Questions (Consolidated)

| # | Question | Input Type | Required | Default | Maps To | Filter or Rank |
|---|----------|------------|----------|---------|---------|----------------|
| Q1 | Which competitive exam did you appear for? | Single select | Yes | JEE Main | `examType` | Filter (determines cutoff data source) |
| Q2 | What is your All India rank / percentile? | Number input + slider | Yes | — | `jeePercentile` | Filter (F3) + Rank (affects ROI via branch cutoffs) |
| Q3 | What is your Class 12 board percentage? | Slider | Yes | — | `class12Percentage` | Filter (F3) |
| Q4 | What is your annual budget for tuition + hostel? | Slider | Yes | ₹12L | `budgetLimit` | Filter (F2) |
| Q5 | Should we strictly exclude colleges above your budget? | Toggle | No | Yes | `isBudgetConstraint` | Filter (F2 toggle) |
| Q6 | Which states/cities are you open to studying in? | Multi-select with "All India" option | No | All India | `preferredLocations` | Filter (F1 toggle) |
| Q7 | Which branches interest you? (select all that apply) | Multi-select cards | Yes (min 1) | CSE | `preferredBranches[]` | Filter (F4) |
| Q8 | Rank what matters most to you (1 = most important) | Drag-reorderable list | Yes | Placements #1 | `priorities[]` | Rank (weight assignment) |

### Priority Mapping Notes

The Predictor page currently maps some UI labels to different internal names:

| UI Label | Internal Key | Note |
|----------|-------------|------|
| Placements | `PLACEMENTS` | Direct match |
| ROI | `ROI` | Direct match |
| Branch Strength | `BRANCH_STRENGTH` | Direct match |
| College Life | `COLLEGE_LIFE` | Direct match |
| Curriculum | `CURRICULUM` | Direct match |
| Extracurriculars | `ROI` | **Mapped to ROI** (V1 inconsistency — should be a separate dimension or removed) |
| Research | `BRANCH_STRENGTH` | **Mapped to Branch Strength** (V1 inconsistency) |

**V1 Decision Needed:** Remove Extracurriculars and Research from UI, or add them as proper scoring dimensions.

---

## 7. College Data Fields

### 7.1 College-Level Fields

| Field | Type | Used For | Category |
|-------|------|----------|----------|
| `id` | UUID | Internal reference | Display |
| `name` | String | Display name | Display |
| `slug` | String | URL-friendly identifier | Display |
| `state` | String | Location filter (F1) | **Filter** |
| `city` | String | Location filter (F1) | **Filter** |
| `logoUrl` | String? | Display | Display |
| `coverImageUrl` | String? | Display | Display |
| `brochureUrl` | String? | External link | Display |
| `officialApplyUrl` | String | External apply link | Display |
| `isPartner` | Boolean | Bonus (IS_PARTNER) | **Ranking** |
| `commissionRate` | Float | Lead/commission system | Business |
| `placementScore` | Float (0–10) | Core ranking dimension R1 | **Ranking** |
| `collegeLifeScore` | Float (0–10) | Core ranking dimension R4 | **Ranking** |
| `curriculumScore` | Float (0–10) | Core ranking dimension R5 | **Ranking** |
| `metadata` | JSON? | Custom scoring attributes (nirf_ranking, infra_rating, etc.) | **Ranking** |

### 7.2 Branch-Level Fields

| Field | Type | Used For | Category |
|-------|------|----------|----------|
| `id` | UUID | Internal reference | Display |
| `collegeId` | FK | Parent college | Internal |
| `branchName` | String | Display name | Display |
| `branchCode` | String | Branch filter (F4), display | **Filter** + Display |
| `tuitionFeeAnnual` | Float | Budget filter (F2), ROI calculation (R2) | **Filter** + **Ranking** |
| `hostelFeeAnnual` | Float | Budget filter (F2) | **Filter** |
| `seatCapacity` | Int | Display / capacity info | Display |
| `avgSalary` | Float? | ROI calculation (R2) | **Ranking** |
| `medianSalary` | Float? | Display (placment info) | Display |
| `highestSalary` | Float? | Display (placment info) | Display |
| `minJeePercentileCutoff` | Float? | Academic filter (F3) | **Filter** |
| `minClass12Cutoff` | Float? | Academic filter (F3) | **Filter** |
| `branchStrengthScore` | Float (0–10) | Core ranking dimension R3 | **Ranking** |
| `metadata` | JSON? | Branch-level custom attributes | **Ranking** |

---

## 8. Field Usage Matrix

### Complete Matrix: Every field and its role

| Field | F1 Location | F2 Budget | F3 Academic | F4 Branch | R1 Placements | R2 ROI | R3 Branch | R4 Life | R5 Curriculum | Custom | Display | Business |
|-------|:-----------:|:---------:|:-----------:|:---------:|:-------------:|:------:|:---------:|:-------:|:-------------:|:------:|:-------:|:--------:|
| `college.state` | ✓ | | | | | | | | | | ✓ | |
| `college.city` | ✓ | | | | | | | | | | ✓ | |
| `college.isPartner` | | | | | | | | | | bonus | ✓ | |
| `college.placementScore` | | | | | ✓ | | | | | | ✓ | |
| `college.collegeLifeScore` | | | | | | | | ✓ | | | ✓ | |
| `college.curriculumScore` | | | | | | | | | ✓ | | ✓ | |
| `college.metadata` | | | | | | | | | | ✓ | ✓ | |
| `branch.branchCode` | | | | ✓ | | | | | | | ✓ | |
| `branch.tuitionFeeAnnual` | | ✓ | | | | ✓ | | | | | ✓ | |
| `branch.hostelFeeAnnual` | | ✓ | | | | | | | | | ✓ | |
| `branch.avgSalary` | | | | | | ✓ | | | | | ✓ | |
| `branch.medianSalary` | | | | | | | | | | | ✓ | |
| `branch.highestSalary` | | | | | | | | | | | ✓ | |
| `branch.minJeePercentileCutoff` | | | ✓ | | | | | | | | ✓ | |
| `branch.minClass12Cutoff` | | | ✓ | | | | | | | | ✓ | |
| `branch.branchStrengthScore` | | | | | | | ✓ | | | | ✓ | |
| `branch.seatCapacity` | | | | | | | | | | | ✓ | |

### Student Input Fields

| Field | Used By |
|-------|---------|
| `jeePercentile` | F3 (Academic filter), R2 (indirectly via branch cutoffs) |
| `class12Percentage` | F3 (Academic filter) |
| `budgetLimit` | F2 (Budget filter) |
| `isBudgetConstraint` | F2 (toggle) |
| `restrictLocation` | F1 (toggle) |
| `preferredLocations[]` | F1 (Location filter) |
| `preferredBranches[]` | F4 (Branch filter) |
| `priorities[]` | Weight assignment (R1–R5) |

---

## 9. Scoring Pipeline (Detailed)

```
FOR EACH college-branch candidate:

  ┌─────────────────────────────────────────────┐
  │ STAGE 1: LOCATION FILTER                    │
  │ if restrictLocation && no match → SKIP      │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ STAGE 2: BUDGET FILTER                      │
  │ if 4yrCost > limit × multiplier → SKIP      │
  │ if 4yrCost > limit → penalty += formula     │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ STAGE 3: ACADEMIC FIT                       │
  │ bestGap = max(jeeGap, c12Gap)               │
  │ if bestGap < excludeLimit → SKIP            │
  │ classify: Safe / Target / Reach / Unlikely  │
  │ apply penalty if Reach or Unlikely          │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ STAGE 4: FACTOR SCORING                     │
  │ For each dimension (R1-R5 + custom):        │
  │   score = normalize(source_field) → 0-100   │
  │   contribution = score × weight             │
  │ baseScore = Σ contributions                 │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ STAGE 5: BONUSES                            │
  │ bonusSum = Σ matching bonus rules           │
  └──────────────────┬──────────────────────────┘
                     ▼
  ┌─────────────────────────────────────────────┐
  │ FINAL SCORE                                 │
  │ finalScore = baseScore + bonusSum - penalties│
  │ clamp to [0, 100]                           │
  └──────────────────┬──────────────────────────┘
                     ▼
  Sort by finalScore descending → assign rank
```

---

## 10. Edge Cases & Rules

| Case | Rule | Current Status |
|------|------|----------------|
| No candidates pass filters | Return empty array with message "No colleges match your criteria" | IMPLEMENTED |
| Student has no JEE score | Skip academic filter, classify as "Target" | IMPLEMENTED |
| Student has no Class 12 score | Skip c12 part of academic filter | IMPLEMENTED |
| College has no avgSalary | Default to ₹4.5L for ROI calculation | IMPLEMENTED |
| Budget not set | Skip budget filter entirely | IMPLEMENTED |
| Location not restricted | Skip location filter | IMPLEMENTED |
| Only 1 branch selected | Only score that branch | IMPLEMENTED |
| Multiple branches per college | Each branch is a separate candidate (same college can appear multiple times) | IMPLEMENTED |
| Tie in scores | Maintain original order (stable sort) | IMPLEMENTED |
| Score exactly 0 | Still shown (clamped to 0, not filtered) | IMPLEMENTED |
| Score exceeds 100 | Clamped to 100 | IMPLEMENTED |

---

## 11. Gaps & Proposed V1 Additions

### Current Gaps Identified

| # | Gap | Impact | Proposed V1 Fix |
|---|-----|--------|-----------------|
| 1 | **No placement percentage data** — only scores, not % of students placed | ROI calculation is approximate | Add `placementPercentage` field to branch |
| 2 | **No fee trend data** — fees may change yearly | Budget filter uses current fees | Acceptable for V1, note as future enhancement |
| 3 | **No college type tag** — government vs private vs deemed | Students may have preference | Add `collegeType` enum: GOVERNMENT, PRIVATE, DEEMED, AUTONOMOUS |
| 4 | **No accreditation data** — NAAC, NBA grades | Quality signal | Add `accreditation` JSON field |
| 5 | **No hostel availability flag** — fee exists but may not have hostel | Misleading cost calculation | Add `hasHostel` boolean |
| 6 | **No exam-to-cutoff mapping** — JEE cutoffs exist but no KCET/MHT-CET/etc. | Only JEE students get academic filtering | V1: Acceptable. V2: Add exam-specific cutoff fields |
| 7 | **Priority UI mismatch** — "Extracurriculars" maps to ROI, "Research" maps to Branch Strength | Confusing user experience | Remove Extracurriculars/Research from UI, keep only 5 core dimensions |
| 8 | **No distance from home** — location is state/city, not distance-based | Students may want "within 200km of home" | V2: Add geolocation + distance filter |
| 9 | **No reservation/category-based cutoffs** — same cutoff for all categories |不公平 for reserved categories | V2: Add category-specific cutoffs |
| 10 | **Config defaults duplicated in 4 places** | Drift between defaults | Consolidate to single `DEFAULT_CONFIG` constant |

### Proposed New Fields (V1 Additions)

| Field | Model | Type | Used For |
|-------|-------|------|----------|
| `placementPercentage` | CollegeBranch | Float? | Better ROI calculation, display |
| `collegeType` | College | Enum | Filter (government/private/deemed) |
| `hasHostel` | CollegeBranch | Boolean | Cost calculation accuracy |
| `accreditation` | College | JSON? | Display, potential future ranking |
| `establishedYear` | College | Int? | Display only |
| `nirfRank` | College | Int? | Display, custom attribute source |
| `website` | College | String? | Display, external link |

---

## Appendix A: Default Scoring Config

```json
{
  "weightStrategy": "ROC",
  "manualWeights": {
    "PLACEMENTS": 0.30,
    "ROI": 0.25,
    "BRANCH_STRENGTH": 0.20,
    "COLLEGE_LIFE": 0.15,
    "CURRICULUM": 0.10
  },
  "budgetPenalty": {
    "active": true,
    "thresholdMultiplier": 1.3,
    "basePenaltyWeight": 40.0,
    "exponent": 2.0
  },
  "academicCompetitiveness": {
    "active": true,
    "safeThreshold": 5.0,
    "reachThreshold": 0.0,
    "unlikelyThreshold": -5.0,
    "reachPenaltyScale": 3.0,
    "unlikelyPenaltyScale": 5.0,
    "excludeLimit": -15.0
  },
  "bonusRules": [
    {
      "id": "placement_ex",
      "type": "PLACEMENT_AVERAGE",
      "threshold": 900000,
      "bonus": 5.0,
      "reason": "Placement average package exceeds ₹9 LPA"
    },
    {
      "id": "partner_b",
      "type": "IS_PARTNER",
      "bonus": 2.0,
      "reason": "Exclusive CollegeMatch Partner"
    }
  ],
  "customScoringAttributes": [
    {
      "key": "nirf_ranking",
      "label": "NIRF Ranking Score",
      "weight": 0.05,
      "defaultValue": 70
    },
    {
      "key": "infra_rating",
      "label": "Infrastructure Score",
      "weight": 0.05,
      "defaultValue": 80
    }
  ]
}
```

## Appendix B: ROC Weight Calculation

The Rank-Order Centroid (ROC) method assigns weights based on position in a ranked list of 5 items:

| Position | ROC Weight | Interpretation |
|----------|-----------|----------------|
| 1 (Most Important) | 0.4567 | ~46% of total weight |
| 2 | 0.2567 | ~26% of total weight |
| 3 | 0.1567 | ~16% of total weight |
| 4 | 0.0900 | ~9% of total weight |
| 5 (Least Important) | 0.0400 | ~4% of total weight |
| **Total** | **1.0000** | |

Formula: `W(i) = (1/n) × Σ(1/k)` for k = i to n, where n = number of items.

## Appendix C: ROI Normalization Formula

```
roiRatio = avgSalary / (tuitionFeeAnnual × 4)
minRoi = min(roiRatio across all candidates)
maxRoi = max(roiRatio across all candidates)
range = maxRoi - minRoi

if range > 0:
  normalizedScore = 30 + ((roiRatio - minRoi) / range) × 70
else:
  normalizedScore = 75  (all colleges have same ROI)
```

This maps the worst ROI to ~30 and the best to ~100, ensuring ROI always contributes meaningfully to the score.

---

*End of V1 Specification*
