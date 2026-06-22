import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import path from "path";
import * as xlsx from "xlsx";
import { normalizeBranchCode } from "@/lib/branches";
import { generateRecommendations, StudentProfile, CollegeCandidate, ScoringConfig } from "@/lib/recommendation";

const SLUG_OVERRIDES: Record<string, string> = {
  'Amrita Vishwa Vidyapeetham (Coimbatore Campus)': 'amrita-coimbatore',
  'Bennett University (Greater Noida)': 'bennett-greater-noida',
  'BITS Goa': 'bits-goa',
  'BITS Hyderabad': 'bits-hyderabad',
  'BITS Pilani (Pilani Campus)': 'bits-pilani',
  'Chitkara University (Punjab Campus)': 'chitkara-punjab',
  'DAIICT Gandhinagar': 'daiict-gandhinagar',
  'Dayananda Sagar College of Engineering (DSCE)': 'dsce-bangalore',
  'FLAME University (CS/DS UG)': 'flame-university',
  'IIIT Bangalore': 'iiit-bangalore',
  'IIIT Hyderabad': 'iiit-hyderabad',
  'K J Somaiya College of Engineering': 'kj-somaiya',
  'KIIT Bhubaneswar (KIIT DU)': 'kiit-bhubaneswar',
  'LNMIIT Jaipur': 'lnmiit-jaipur',
  'Manipal Institute of Technology (MIT Manipal)': 'mit-manipal',
  'Manipal University Jaipur (MIT Jaipur)': 'mit-jaipur',
  "Masters' Union": 'masters-union',
  'MIT Bengaluru (Manipal Institute of Technology, Bengaluru)': 'mit-bengaluru',
  'MIT World Peace University (MIT-WPU Pune)': 'mit-wpu-pune',
  'NMIMS MPSTME (Mumbai)': 'nmims-mpstme',
  'OP Jindal University (Raigarh)': 'op-jindal-university-raigarh',
  'PES University (RR Campus)': 'pes-university-rr',
  'Punjab Engineering College (PEC) Chandigarh': 'pec-chandigarh',
  'Quantum University (Roorkee)': 'quantum-university-roorkee',
  'Ramaiah Institute of Technology (MSRIT)': 'msrit-bangalore',
  'RV College of Engineering': 'rvce-bangalore',
  'Scaler School of Technology': 'scaler-sot',
  'Shiv Nadar University (Greater Noida)': 'snu-greater-noida',
  'SRM Institute of Science and Technology (SRM KTR)': 'srm-ktr',
  'Symbiosis Institute of Technology (SIT Pune)': 'sit-pune',
  'Thapar Institute of Engineering and Technology': 'thapar-patiala',
  'UPES Dehradun': 'upes-dehradun',
  'Vishwakarma Institute of Technology (VIT Pune)': 'vit-pune',
  'VIT Chennai': 'vit-chennai',
  'VIT Vellore': 'vit-vellore',
  'Woxsen University (Hyderabad)': 'woxsen-hyderabad',
};

const ADMIN_EMAIL_MAP: Record<string, string> = {
  'vit-vellore': 'admissions@vit.edu',
  'vit-chennai': 'admissions.chennai@vit.ac.in',
  'mit-manipal': 'admissions@manipal.edu',
  'op-jindal-university-raigarh': 'admissions@opju.ac.in',
  'quantum-university-roorkee': 'admissions@quantum.edu',
  'dsce-bangalore': 'admissions@dsce.edu',
  'bennett-greater-noida': 'admissions@bennett.edu.in',
  'upes-dehradun': 'admissions@upes.ac.in',
  'mit-jaipur': 'admissions@mitjaipur.edu',
  'chitkara-punjab': 'admissions@chitkara.edu.in',
  'kj-somaiya': 'admissions@kjsce.somaiya.edu',
  'woxsen-hyderabad': 'admissions@woxsen.edu.in',
  'snu-greater-noida': 'admissions@snu.edu.in',
  'mit-wpu-pune': 'admissions@mitwpu.edu.in',
  'kiit-bhubaneswar': 'admissions@kiit.ac.in',
  'flame-university': 'admissions@flame.edu.in',
  'mit-bengaluru': 'admissions@mitb.edu',
  'srm-ktr': 'admissions@srmist.edu.in',
  'sit-pune': 'admissions@sitpune.edu.in',
  'nmims-mpstme': 'admissions@nmims.edu',
  'amrita-coimbatore': 'admissions@amrita.edu',
};

const FALLBACK_FEES: Record<string, { tuition: number; hostel: number }> = {
  'iiit-bangalore': { tuition: 400000, hostel: 120000 },
  'iiit-hyderabad': { tuition: 400000, hostel: 120000 },
  'snu-greater-noida': { tuition: 350000, hostel: 150000 },
  'lnmiit-jaipur': { tuition: 320000, hostel: 90000 },
  'daiict-gandhinagar': { tuition: 270000, hostel: 80000 },
  'pec-chandigarh': { tuition: 180000, hostel: 70000 },
  'mit-jaipur': { tuition: 325000, hostel: 120000 },
};

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function num(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? fallback : n;
}

function bool(val: any): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1';
}

function mapCandidate(b: any): CollegeCandidate {
  return {
    id: b.college.id,
    name: b.college.name,
    slug: b.college.slug,
    state: b.college.state,
    city: b.college.city,
    logoUrl: b.college.logoUrl,
    coverImageUrl: b.college.coverImageUrl,
    brochureUrl: b.college.brochureUrl,
    officialApplyUrl: b.college.officialApplyUrl,
    website: b.college.website,
    isPartner: b.college.isPartner,
    isNewGen: b.college.isNewGen,
    commissionRate: b.college.commissionRate,
    placementScore: b.college.placementScore,
    collegeLifeScore: b.college.collegeLifeScore,
    curriculumScore: b.college.curriculumScore,
    metadata: b.college.metadata,

    branchId: b.id,
    branchName: b.branchName,
    branchCode: b.branchCode,
    tuitionFeeAnnual: b.tuitionFeeAnnual,
    hostelFeeAnnual: b.hostelFeeAnnual,
    seatCapacity: b.seatCapacity,
    avgSalary: b.avgSalary,
    medianSalary: b.medianSalary,
    highestSalary: b.highestSalary,
    minJeePercentileCutoff: b.minJeePercentileCutoff,
    minClass12Cutoff: b.minClass12Cutoff,
    branchStrengthScore: b.branchStrengthScore,
    placementPercentage: b.placementPercentage,
    branchMetadata: b.metadata,
  };
}

async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;
  if (!token) return false;
  const decoded = await verifyToken(token);
  return decoded !== null && decoded.role === "SUPERADMIN";
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate that it is an excel file
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json({ error: "Invalid file type. Only Excel (.xlsx, .xls) files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logs: string[] = [];

    // 1. Try to save Excel file locally for dev environments (ignores EROFS in serverless prod)
    try {
      const projectRoot = process.cwd();
      const excelName = "collegematch_ranked_2026-06-13 (3).xlsx";
      const rootPath = path.join(projectRoot, excelName);
      const templatesPath = path.join(projectRoot, "templates", excelName);

      await writeFile(rootPath, buffer);
      await writeFile(templatesPath, buffer);
      logs.push(`Saved spreadsheet locally to project root and templates folder.`);
    } catch (fsError: any) {
      logs.push(`Running in serverless/read-only mode. Bypassing disk write (database updates will still run in memory).`);
    }

    // 2. Parse Excel buffer in-memory
    logs.push("Parsing uploaded spreadsheet data in-memory...");
    const wb = xlsx.read(buffer, { type: "buffer" });
    
    if (!wb.Sheets['Colleges'] || !wb.Sheets['Branches']) {
      return NextResponse.json({ error: "Excel must contain 'Colleges' and 'Branches' tabs." }, { status: 400 });
    }

    const collegesRows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['Colleges']);
    const branchesRows: any[] = xlsx.utils.sheet_to_json(wb.Sheets['Branches']);

    logs.push(`Parsed ${collegesRows.length} colleges and ${branchesRows.length} branches from spreadsheet.`);

    // 3. Database transaction to wipe branches/admins and upsert colleges
    logs.push("Updating database tables inside transaction...");
    await prisma.$transaction(async (tx) => {
      // Wiping child records to re-link correctly
      await tx.collegeBranch.deleteMany({});
      await tx.collegeAdminProfile.deleteMany({});

      const collegeNameToId = new Map<string, string>();
      const collegeNameToPlacementScore = new Map<string, number>();

      for (const row of collegesRows) {
        if (!row.name) continue;
        const name = String(row.name).trim();
        const slug = SLUG_OVERRIDES[name] || slugify(name);

        const rankVal = row.rank !== undefined ? num(row.rank) : null;
        const infraRatingVal = row.infra_rating !== undefined ? num(row.infra_rating) : null;
        const startupResearchVal = row['startup_ecosystem'] !== undefined ? num(row['startup_ecosystem']) : null;
        const sportsExtracurriculumVal = row['sports & extracurricular'] !== undefined ? num(row['sports & extracurricular']) : (row['sports & extracurriculum'] !== undefined ? num(row['sports & extracurriculum']) : null);
        const internationalExposureVal = row.international_exposure !== undefined ? num(row.international_exposure) : null;

        const metadataObj: Record<string, any> = {
          rank: rankVal,
          nirf_ranking: rankVal,
          infra_rating: infraRatingVal,
          startup_ecosystem: startupResearchVal,
          research_output: startupResearchVal,
          sports_extracurriculum: sportsExtracurriculumVal,
          extracurriculars: sportsExtracurriculumVal,
          international_exposure: internationalExposureVal,
          exposure_score: internationalExposureVal,
        };

        const placementScore = num(row.placementScore);

        const existingCollege = await tx.college.findUnique({ where: { slug } });
        let collegeId = "";

        if (existingCollege) {
          collegeId = existingCollege.id;
          await tx.college.update({
            where: { id: collegeId },
            data: {
              name,
              state: String(row.state || '').trim(),
              city: String(row.city || '').trim(),
              officialApplyUrl: String(row.officialApplyUrl || 'https://example.com/apply').trim(),
              website: String(row.website || '').trim() || null,
              isPartner: bool(row.isPartner),
              commissionRate: num(row.commissionRate),
              placementScore,
              collegeLifeScore: num(row.collegeLifeScore),
              curriculumScore: num(row.curriculumScore),
              metadata: JSON.stringify(metadataObj),
            }
          });
          logs.push(`  Updated College: ${name}`);
        } else {
          const createdCollege = await tx.college.create({
            data: {
              name,
              slug,
              state: String(row.state || '').trim(),
              city: String(row.city || '').trim(),
              officialApplyUrl: String(row.officialApplyUrl || 'https://example.com/apply').trim(),
              website: String(row.website || '').trim() || null,
              isPartner: bool(row.isPartner),
              isNewGen: false,
              commissionRate: num(row.commissionRate),
              placementScore,
              collegeLifeScore: num(row.collegeLifeScore),
              curriculumScore: num(row.curriculumScore),
              metadata: JSON.stringify(metadataObj),
            }
          });
          collegeId = createdCollege.id;
          logs.push(`  Created College: ${name}`);
        }

        collegeNameToId.set(name.toLowerCase(), collegeId);
        collegeNameToPlacementScore.set(name.toLowerCase(), placementScore);

        // Link superadmin admin users
        const adminEmail = ADMIN_EMAIL_MAP[slug];
        if (adminEmail) {
          const userObj = await tx.user.findUnique({ where: { email: adminEmail } });
          if (userObj) {
            await tx.collegeAdminProfile.create({
              data: {
                userId: userObj.id,
                collegeId: collegeId,
              }
            });
            logs.push(`    Linked admissions admin: ${adminEmail}`);
          }
        }
      }

      // Seed Branches
      for (const row of branchesRows) {
        const collegeName = String(row.collegeName || '').trim();
        const collegeId = collegeNameToId.get(collegeName.toLowerCase());

        if (!collegeId) {
          logs.push(`  Warning: College not found for branch: ${collegeName}. Skipping.`);
          continue;
        }

        const branchCode = String(row.branchCode || '').trim();
        let branchName = "Computer Science & Engineering";
        if (branchCode.endsWith("_CAT1")) branchName = "Computer Science & Engineering (Category 1)";
        else if (branchCode.endsWith("_CAT2")) branchName = "Computer Science & Engineering (Category 2)";
        else if (branchCode.endsWith("_CAT3")) branchName = "Computer Science & Engineering (Category 3)";
        else if (branchCode.endsWith("_CAT4")) branchName = "Computer Science & Engineering (Category 4)";

        const collegeSlug = SLUG_OVERRIDES[collegeName] || slugify(collegeName);
        let tuitionFeeAnnual = num(row.tuitionFeeAnnual);
        let hostelFeeAnnual = num(row.hostelFeeAnnual);

        if (tuitionFeeAnnual === 0) {
          const fallback = FALLBACK_FEES[collegeSlug];
          if (fallback) {
            tuitionFeeAnnual = fallback.tuition;
            hostelFeeAnnual = fallback.hostel;
          }
        }
        const minJeePercentileCutoff = num(row['equivalent jeepercentilecutoff'] !== undefined ? row['equivalent jeepercentilecutoff'] : row.minJeePercentileCutoff);
        const minClass12Cutoff = num(row.minClass12Cutoff);
        const avgSalary = num(row.avgSalary) || null;
        const medianSalary = num(row.medianSalary) || null;
        const highestSalary = num(row.highestSalary) || null;
        const placementPercentage = num(row.placementPercentage) || null;

        let feeCategory = null;
        if (branchCode.includes("_CAT")) {
          const match = branchCode.match(/_CAT(\d+)/);
          if (match) {
            feeCategory = `Category ${match[1]}`;
          }
        }

        const branchMetadata = feeCategory ? JSON.stringify({ feeCategory }) : null;
        const parentPlacementScore = collegeNameToPlacementScore.get(collegeName.toLowerCase()) || 8.0;
        const branchStrengthScore = parentPlacementScore;

        await tx.collegeBranch.create({
          data: {
            collegeId,
            branchName,
            branchCode,
            tuitionFeeAnnual,
            hostelFeeAnnual,
            seatCapacity: 120,
            avgSalary,
            medianSalary,
            highestSalary,
            minJeePercentileCutoff,
            minClass12Cutoff,
            branchStrengthScore,
            placementPercentage,
            metadata: branchMetadata,
          }
        });
      }
    }, { timeout: 60000 });

    logs.push("Database seeding completed.");

    // 4. Recompute recommendations for all students
    logs.push("Recomputing matching recommendations for all active student accounts...");
    const students = await prisma.student.findMany({
      include: {
        locations: true,
        priorities: { orderBy: { rankOrder: "asc" } },
        recommendations: true,
      },
    });

    if (students.length > 0) {
      const dbBranches = await prisma.collegeBranch.findMany({ include: { college: true } });
      const allCandidates: CollegeCandidate[] = dbBranches.map(mapCandidate);

      const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "matching_rules" } });
      const config: ScoringConfig = dbConfig ? JSON.parse(dbConfig.value) : {
        weightStrategy: "CAREER_GOAL_PRIORITY",
        manualWeights: { PLACEMENTS: 0.30, ROI: 0.25, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.10 },
        careerGoalWeights: {
          PLACEMENT: { PLACEMENTS: 0.40, ROI: 0.20, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.10, CURRICULUM: 0.15 },
          STARTUP: { PLACEMENTS: 0.10, ROI: 0.10, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.45 },
          HIGHER_STUDIES: { PLACEMENTS: 0.05, ROI: 0.12, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.13, CURRICULUM: 0.55 },
          NOT_SURE: { PLACEMENTS: 0.20, ROI: 0.20, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.20, CURRICULUM: 0.20 },
        },
        priorityAdjustment: { active: true, boostPerRank: 0.10, maxAdjustment: 0.30 },
        careerGoalExtraDimensions: {
          PLACEMENT: [{ key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.15, source: "branch_metadata", computation: "placement_percentage" }],
          STARTUP: [{ key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.15, source: "college_metadata", metadataKey: "startup_ecosystem" }],
          HIGHER_STUDIES: [
            { key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.10, source: "college_metadata", metadataKey: "research_output" },
            { key: "INTERNATIONAL_EXPOSURE", label: "International exposure & exchange programs", weight: 0.05, source: "college_metadata", metadataKey: "international_exposure" },
          ],
          NOT_SURE: [],
        },
        budgetPenalty: { active: true, thresholdMultiplier: 1.3, basePenaltyWeight: 40.0, exponent: 2.0 },
        academicCompetitiveness: {
          active: true, safeThreshold: 5.0, reachThreshold: 0.0, unlikelyThreshold: -5.0,
          reachPenaltyScale: 3.0, unlikelyPenaltyScale: 5.0, excludeLimit: -15.0,
        },
        bonusRules: [
          { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
          { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" },
        ],
        customScoringAttributes: [],
      };

      for (const student of students) {
        try {
          const engineProfile: StudentProfile = {
            jeePercentile: student.jeePercentile,
            class12Percentage: student.class12Percentage,
            budgetLimit: student.budgetLimit,
            isBudgetConstraint: student.isBudgetConstraint,
            restrictLocation: student.restrictLocation,
            preferredLocations: student.locations.map((l) => ({ state: l.state, city: l.city })),
            priorities: student.priorities.map((p) => ({ criteria: p.criteria, rankOrder: p.rankOrder })),
            preferredBranches: ["CSE", "IT", "ECE"],
            careerGoal: (student.careerGoal as any) || "NOT_SURE",
          };

          const targetBranches = engineProfile.preferredBranches.map((b) => normalizeBranchCode(b));
          const candidates = allCandidates.filter((c) =>
            targetBranches.includes(normalizeBranchCode(c.branchCode))
          );

          const recommendations = generateRecommendations(engineProfile, candidates, config);
          const top100 = recommendations.slice(0, 100);

          await prisma.recommendation.deleteMany({ where: { studentId: student.id } });
          if (top100.length > 0) {
            await prisma.recommendation.createMany({
              data: top100.map((r) => ({
                studentId: student.id,
                collegeId: r.collegeId,
                branchCode: r.branchCode,
                matchScore: r.matchScore,
                qualityScore: r.qualityScore,
                admissionProbability: r.admissionProbability,
                rankPosition: r.rankPosition,
                reasons: JSON.stringify(r.keyReasons),
              })),
            });
          }
          logs.push(`  Updated recommendations for: ${student.email}`);
        } catch (err: any) {
          logs.push(`  Error recomputing for ${student.email}: ${err.message}`);
        }
      }
    }

    logs.push("All tasks completed successfully. Master Database matches current sheet.");

    return NextResponse.json({
      success: true,
      message: "Master Excel sheet loaded and database recomputed successfully in-memory.",
      output: logs.join("\n"),
      errors: null
    });
  } catch (error: any) {
    console.error("Master Excel Import Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal Server Error",
      details: error.message
    }, { status: 500 });
  }
}
