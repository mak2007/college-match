import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database cleanup and seeding with ALL colleges...");

  // 1. Clean up existing database tables
  console.log("Cleaning up old data...");
  await prisma.systemConfig.deleteMany({});
  await prisma.commissionTransaction.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.studentPriority.deleteMany({});
  await prisma.studentLocation.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.collegeBranch.deleteMany({});
  await prisma.collegeAdminProfile.deleteMany({});
  await prisma.college.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Default Matching Configuration Rules
  console.log("Seeding system configurations...");
  const defaultMatchingRules = {
    weightStrategy: "CAREER_GOAL_PRIORITY",
    manualWeights: {
      PLACEMENTS: 0.30,
      ROI: 0.25,
      BRANCH_STRENGTH: 0.20,
      COLLEGE_LIFE: 0.15,
      CURRICULUM: 0.10,
    },
    careerGoalWeights: {
      PLACEMENT: { PLACEMENTS: 0.40, ROI: 0.20, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.10, CURRICULUM: 0.15 },
      STARTUP: { PLACEMENTS: 0.10, ROI: 0.10, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.15, CURRICULUM: 0.45 },
      HIGHER_STUDIES: { PLACEMENTS: 0.05, ROI: 0.12, BRANCH_STRENGTH: 0.15, COLLEGE_LIFE: 0.13, CURRICULUM: 0.55 },
      NOT_SURE: { PLACEMENTS: 0.20, ROI: 0.20, BRANCH_STRENGTH: 0.20, COLLEGE_LIFE: 0.20, CURRICULUM: 0.20 },
    },
    priorityAdjustment: {
      active: true,
      boostPerRank: 0.10,
      maxAdjustment: 0.30,
    },
    careerGoalExtraDimensions: {
      PLACEMENT: [
        { key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.15, source: "branch_metadata", computation: "placement_percentage" },
      ],
      STARTUP: [
        { key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.15, source: "college_metadata", metadataKey: "startup_ecosystem" },
      ],
      HIGHER_STUDIES: [
        { key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.10, source: "college_metadata", metadataKey: "research_output" },
        { key: "INTERNATIONAL_EXPOSURE", label: "International exposure & exchange programs", weight: 0.05, source: "college_metadata", metadataKey: "international_exposure" },
      ],
      NOT_SURE: [],
    },
    budgetPenalty: {
      active: true,
      thresholdMultiplier: 1.15,
      basePenaltyWeight: 50.0,
      exponent: 2.5,
    },
    academicCompetitiveness: {
      active: true,
      safeThreshold: 5.0,
      reachThreshold: 0.0,
      unlikelyThreshold: -5.0,
      reachPenaltyScale: 5.0,
      unlikelyPenaltyScale: 8.0,
      excludeLimit: -15.0,
    },
    bonusRules: [
      { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
      { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" }
    ],
    customScoringAttributes: [
      { key: "infra_rating", label: "Infrastructure Score", weight: 0.05, defaultValue: 80 }
    ]
  };

  await prisma.systemConfig.create({
    data: {
      key: "matching_rules",
      value: JSON.stringify(defaultMatchingRules, null, 2),
    },
  });

  // 3. Create Superadmin User
  console.log("Creating users...");
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", salt);
  const collegePasswordHash = await bcrypt.hash("CollegePass123!", salt);

  await prisma.user.create({
    data: {
      email: "admin@collegematch.in",
      passwordHash: adminPasswordHash,
      role: "SUPERADMIN",
    },
  });

  // Create college admin accounts
  await prisma.user.create({
    data: { email: "admissions@vit.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@manipal.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@opju.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@quantum.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@dsce.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@bennett.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@upes.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@mitjaipur.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@chitkara.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@kjsce.somaiya.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@woxsen.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@snu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@mitwpu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@kiit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@flame.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@mitb.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@srmist.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@sitpune.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@nmims.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@amrita.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });

    await prisma.user.create({
    data: { email: "admissions.chennai@vit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });

  // 4. Define ALL Colleges Data
  const collegesData = [
  {
    "name": "Vellore Institute of Technology (VIT)",
    "slug": "vit-vellore",
    "state": "Tamil Nadu",
    "city": "Vellore",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://vit.ac.in/files/brochure.pdf",
    "officialApplyUrl": "https://viteee.vit.ac.in/",
    "website": "https://vit.ac.in",
    "isPartner": true,
    "commissionRate": 25000,
    "placementScore": 9.2,
    "collegeLifeScore": 8.8,
    "curriculumScore": 9,
    "adminEmail": "admissions@vit.edu",
    "metadata": "{\"nirf_ranking\":11,\"infra_rating\":90,\"startup_ecosystem\":8.5,\"research_output\":7,\"international_exposure\":6.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 198000,
        "hostelFeeAnnual": 95000,
        "seatCapacity": 1200,
        "avgSalary": 920000,
        "medianSalary": 850000,
        "highestSalary": 4400000,
        "minJeePercentileCutoff": 94.5,
        "minClass12Cutoff": 85,
        "branchStrengthScore": 9.5,
        "placementPercentage": 95,
        "metadata": "{\"lab_rating\":9.2}"
      },
      {
        "branchName": "Electronics & Communication Engineering",
        "branchCode": "ECE",
        "tuitionFeeAnnual": 195000,
        "hostelFeeAnnual": 95000,
        "seatCapacity": 600,
        "avgSalary": 750000,
        "medianSalary": 700000,
        "highestSalary": 2200000,
        "minJeePercentileCutoff": 90,
        "minClass12Cutoff": 80,
        "branchStrengthScore": 8.8,
        "placementPercentage": 88,
        "metadata": "{\"lab_rating\":8.5}"
      },
      {
        "branchName": "Information Technology",
        "branchCode": "IT",
        "tuitionFeeAnnual": 198000,
        "hostelFeeAnnual": 95000,
        "seatCapacity": 300,
        "avgSalary": 860000,
        "medianSalary": 800000,
        "highestSalary": 3200000,
        "minJeePercentileCutoff": 93,
        "minClass12Cutoff": 82,
        "branchStrengthScore": 9.2,
        "placementPercentage": 92,
        "metadata": "{\"lab_rating\":9}"
      }
    ]
  },
  {
    "name": "Manipal Institute of Technology (MIT)",
    "slug": "mit-manipal",
    "state": "Karnataka",
    "city": "Manipal",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
    "brochureUrl": "https://manipal.edu/brochure.pdf",
    "officialApplyUrl": "https://apply.manipal.edu/",
    "website": "https://manipal.edu",
    "isPartner": true,
    "commissionRate": 30000,
    "placementScore": 8.9,
    "collegeLifeScore": 9.6,
    "curriculumScore": 8.7,
    "adminEmail": "admissions@manipal.edu",
    "metadata": "{\"nirf_ranking\":21,\"infra_rating\":95,\"startup_ecosystem\":9,\"research_output\":8.5,\"international_exposure\":9.2}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 335000,
        "hostelFeeAnnual": 110000,
        "seatCapacity": 400,
        "avgSalary": 1250000,
        "medianSalary": 1100000,
        "highestSalary": 5400000,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 88,
        "branchStrengthScore": 9.4,
        "placementPercentage": 97,
        "metadata": "{\"lab_rating\":9.5}"
      },
      {
        "branchName": "Electronics & Communication Engineering",
        "branchCode": "ECE",
        "tuitionFeeAnnual": 290000,
        "hostelFeeAnnual": 110000,
        "seatCapacity": 240,
        "avgSalary": 900000,
        "medianSalary": 820000,
        "highestSalary": 2800000,
        "minJeePercentileCutoff": 91.5,
        "minClass12Cutoff": 80,
        "branchStrengthScore": 8.9,
        "placementPercentage": 90,
        "metadata": "{\"lab_rating\":8.8}"
      }
    ]
  },
  {
    "name": "RV College of Engineering (RVCE)",
    "slug": "rvce-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://rvce.edu.in/brochure.pdf",
    "officialApplyUrl": "https://rvce.edu.in/admissions",
    "website": "https://rvce.edu.in",
    "isPartner": false,
    "commissionRate": 0,
    "placementScore": 9.6,
    "collegeLifeScore": 7.2,
    "curriculumScore": 8.5,
    "metadata": "{\"nirf_ranking\":9,\"infra_rating\":78,\"startup_ecosystem\":7.5,\"research_output\":9,\"international_exposure\":7}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 250000,
        "hostelFeeAnnual": 85000,
        "seatCapacity": 240,
        "avgSalary": 1540000,
        "medianSalary": 1400000,
        "highestSalary": 5700000,
        "minJeePercentileCutoff": 97.2,
        "minClass12Cutoff": 90,
        "branchStrengthScore": 9.8,
        "placementPercentage": 98,
        "metadata": "{\"lab_rating\":9.4}"
      },
      {
        "branchName": "Information Science & Engineering",
        "branchCode": "ISE",
        "tuitionFeeAnnual": 250000,
        "hostelFeeAnnual": 85000,
        "seatCapacity": 180,
        "avgSalary": 1320000,
        "medianSalary": 1200000,
        "highestSalary": 4200000,
        "minJeePercentileCutoff": 96.5,
        "minClass12Cutoff": 88,
        "branchStrengthScore": 9.5,
        "placementPercentage": 96,
        "metadata": "{\"lab_rating\":9.2}"
      }
    ]
  },
  {
    "name": "DY Patil College of Engineering (Akurdi)",
    "slug": "dypatil-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
    "brochureUrl": "https://dypcoeakurdi.ac.in/brochure.pdf",
    "officialApplyUrl": "https://dypcoeakurdi.ac.in/admissions",
    "website": "https://dypcoeakurdi.ac.in",
    "isPartner": true,
    "commissionRate": 15000,
    "placementScore": 7.7,
    "collegeLifeScore": 8.4,
    "curriculumScore": 7.9,
    "metadata": "{\"nirf_ranking\":150,\"infra_rating\":84,\"startup_ecosystem\":6,\"research_output\":5.5,\"international_exposure\":5}",
    "branches": [
      {
        "branchName": "Computer Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 135000,
        "hostelFeeAnnual": 90000,
        "seatCapacity": 180,
        "avgSalary": 580000,
        "medianSalary": 520000,
        "highestSalary": 1800000,
        "minJeePercentileCutoff": 87,
        "minClass12Cutoff": 75,
        "branchStrengthScore": 8,
        "placementPercentage": 82,
        "metadata": "{\"lab_rating\":8}"
      }
    ]
  },
  {
    "name": "OP Jindal University (Raigarh)",
    "slug": "op-jindal-university-raigarh",
    "state": "Chhattisgarh",
    "city": "Raigarh",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.opju.ac.in/brochure.pdf",
    "officialApplyUrl": "https://www.opju.ac.in/programmes/btech-cse",
    "website": "https://www.opju.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 7.8,
    "collegeLifeScore": 7.6,
    "curriculumScore": 7.8,
    "adminEmail": "admissions@opju.ac.in",
    "metadata": "{\"infra_rating\":77,\"startup_ecosystem\":7,\"research_output\":6.8,\"exposure_score\":7.8}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 187500,
        "hostelFeeAnnual": 70000,
        "seatCapacity": 120,
        "avgSalary": 500000,
        "medianSalary": 450000,
        "highestSalary": 700000,
        "minJeePercentileCutoff": 60,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 7.8,
        "placementPercentage": 80,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "Quantum University (Roorkee)",
    "slug": "quantum-university-roorkee",
    "state": "Uttarakhand",
    "city": "Roorkee",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
    "brochureUrl": "https://quantumuniversity.edu.in/brochure.pdf",
    "officialApplyUrl": "https://quantumuniversity.edu.in/admissions/btech",
    "website": "https://quantumuniversity.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 7.5,
    "collegeLifeScore": 7.8,
    "curriculumScore": 7.6,
    "adminEmail": "admissions@quantum.edu",
    "metadata": "{\"infra_rating\":74,\"startup_ecosystem\":7,\"research_output\":6.6,\"exposure_score\":7.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 135000,
        "hostelFeeAnnual": 75000,
        "seatCapacity": 180,
        "avgSalary": 480000,
        "medianSalary": 420000,
        "highestSalary": 1200000,
        "minJeePercentileCutoff": 55,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 7.5,
        "placementPercentage": 75,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "Dayananda Sagar College of Engineering (DSCE)",
    "slug": "dsce-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.dsce.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.dsce.edu.in/admissions",
    "website": "https://www.dsce.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "adminEmail": "admissions@dsce.edu",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.6,\"research_output\":7.3,\"exposure_score\":8.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 110000,
        "hostelFeeAnnual": 120000,
        "seatCapacity": 240,
        "avgSalary": 750000,
        "medianSalary": 600000,
        "highestSalary": 5600000,
        "minJeePercentileCutoff": 97,
        "minClass12Cutoff": 45,
        "branchStrengthScore": 8.6,
        "placementPercentage": 85,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true}"
      }
    ]
  },
  {
    "name": "Bennett University (Greater Noida)",
    "slug": "bennett-greater-noida",
    "state": "Uttar Pradesh",
    "city": "Greater Noida",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.bennett.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.bennett.edu.in/programmes/btech-cse",
    "website": "https://www.bennett.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.8,
    "adminEmail": "admissions@bennett.edu.in",
    "metadata": "{\"infra_rating\":85,\"startup_ecosystem\":8.2,\"research_output\":7.8,\"exposure_score\":9}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 403750,
        "hostelFeeAnnual": 170000,
        "seatCapacity": 600,
        "avgSalary": 942000,
        "medianSalary": 800000,
        "highestSalary": 13700000,
        "minJeePercentileCutoff": 62,
        "minClass12Cutoff": 55,
        "branchStrengthScore": 9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"60-88\"}"
      }
    ]
  },
  {
    "name": "Vishwakarma Institute of Technology (VIT Pune)",
    "slug": "vit-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.vit.edu/brochure.pdf",
    "officialApplyUrl": "https://www.vit.edu/admissions",
    "website": "https://www.vit.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "adminEmail": "admissions@vit.edu",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.5,\"research_output\":7.2,\"exposure_score\":8.4}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 212000,
        "hostelFeeAnnual": 125000,
        "seatCapacity": 240,
        "avgSalary": 950000,
        "medianSalary": 950000,
        "highestSalary": 4500000,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.6,
        "placementPercentage": 95,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"jeeOverlapRange\":\"94-98\"}"
      }
    ]
  },
  {
    "name": "UPES Dehradun",
    "slug": "upes-dehradun",
    "state": "Uttarakhand",
    "city": "Dehradun",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.upes.ac.in/brochure.pdf",
    "officialApplyUrl": "https://www.upes.ac.in/schools/school-of-computer-science/btech-computer-science-engineering",
    "website": "https://www.upes.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.6,
    "collegeLifeScore": 8.1,
    "curriculumScore": 8.4,
    "adminEmail": "admissions@upes.ac.in",
    "metadata": "{\"infra_rating\":83,\"startup_ecosystem\":8,\"research_output\":7.6,\"exposure_score\":8.7}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 425000,
        "hostelFeeAnnual": 180000,
        "seatCapacity": 600,
        "avgSalary": 841000,
        "medianSalary": 750000,
        "highestSalary": 5009000,
        "minJeePercentileCutoff": 90,
        "minClass12Cutoff": 55,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"acceptsBoardsOnly\":true,\"jeeOverlapRange\":\"85-95\"}"
      }
    ]
  },
  {
    "name": "Manipal University Jaipur (MIT Jaipur)",
    "slug": "mit-jaipur",
    "state": "Rajasthan",
    "city": "Jaipur",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://jaipur.manipal.edu/brochure.pdf",
    "officialApplyUrl": "https://jaipur.manipal.edu/foe/programs/program-list/btech-computer-science-engineering.html",
    "website": "https://jaipur.manipal.edu",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.2,
    "adminEmail": "admissions@mitjaipur.edu",
    "metadata": "{\"infra_rating\":81,\"startup_ecosystem\":7.4,\"research_output\":7.2,\"exposure_score\":8.3}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 350000,
        "hostelFeeAnnual": 170000,
        "seatCapacity": 300,
        "avgSalary": 750000,
        "medianSalary": 700000,
        "highestSalary": 2200000,
        "minJeePercentileCutoff": 80,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.3,
        "placementPercentage": 80,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "Chitkara University (Punjab Campus)",
    "slug": "chitkara-punjab",
    "state": "Punjab",
    "city": "Rajpura",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.chitkara.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.chitkara.edu.in/engineering/b-tech-computer-science-engineering",
    "website": "https://www.chitkara.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.3,
    "collegeLifeScore": 8.1,
    "curriculumScore": 8.1,
    "adminEmail": "admissions@chitkara.edu.in",
    "metadata": "{\"infra_rating\":80,\"startup_ecosystem\":7.4,\"research_output\":7.1,\"exposure_score\":8.2}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 240000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 400,
        "avgSalary": 650000,
        "medianSalary": 600000,
        "highestSalary": 1800000,
        "minJeePercentileCutoff": 75,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.4,
        "placementPercentage": 80,
        "metadata": "{\"acceptsJEE\":true,\"acceptsBoardsOnly\":true}"
      }
    ]
  },
  {
    "name": "K J Somaiya College of Engineering",
    "slug": "kj-somaiya",
    "state": "Maharashtra",
    "city": "Mumbai",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://kjsce.somaiya.edu/brochure.pdf",
    "officialApplyUrl": "https://kjsce.somaiya.edu/en/programme/btech-computer-engineering",
    "website": "https://kjsce.somaiya.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.5,
    "adminEmail": "admissions@kjsce.somaiya.edu",
    "metadata": "{\"infra_rating\":84,\"startup_ecosystem\":7.8,\"research_output\":7.4,\"exposure_score\":8.7}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 600000,
        "hostelFeeAnnual": 180000,
        "seatCapacity": 120,
        "avgSalary": 945000,
        "medianSalary": 750000,
        "highestSalary": 5800000,
        "minJeePercentileCutoff": 95,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.7,
        "placementPercentage": 93,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"jeeOverlapRange\":\"92-97\"}"
      }
    ]
  },
  {
    "name": "Woxsen University (Hyderabad)",
    "slug": "woxsen-hyderabad",
    "state": "Telangana",
    "city": "Hyderabad",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://woxsen.edu.in/brochure.pdf",
    "officialApplyUrl": "https://woxsen.edu.in/admissions",
    "website": "https://woxsen.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "adminEmail": "admissions@woxsen.edu.in",
    "metadata": "{\"infra_rating\":83,\"startup_ecosystem\":7.8,\"research_output\":7.2,\"exposure_score\":8.4}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 406250,
        "hostelFeeAnnual": 510000,
        "seatCapacity": 120,
        "avgSalary": 860000,
        "medianSalary": 750000,
        "highestSalary": 2400000,
        "minJeePercentileCutoff": 85,
        "minClass12Cutoff": 55,
        "branchStrengthScore": 8.6,
        "placementPercentage": 90,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"80-92\"}"
      }
    ]
  },
  {
    "name": "Shiv Nadar University (Greater Noida)",
    "slug": "snu-greater-noida",
    "state": "Uttar Pradesh",
    "city": "Greater Noida",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.snu.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.snu.edu.in/programs/btech-computer-science-and-engineering",
    "website": "https://www.snu.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 8.5,
    "curriculumScore": 8.8,
    "adminEmail": "admissions@snu.edu.in",
    "metadata": "{\"infra_rating\":84,\"startup_ecosystem\":8,\"research_output\":8,\"exposure_score\":8.9}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 400000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 180,
        "avgSalary": 1082000,
        "medianSalary": 845000,
        "highestSalary": 5079000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 88,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"90-96\"}"
      }
    ]
  },
  {
    "name": "MIT World Peace University (MIT-WPU Pune)",
    "slug": "mit-wpu-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://mitwpu.edu.in/brochure.pdf",
    "officialApplyUrl": "https://mitwpu.edu.in/programmes/btech-computer-science-engineering",
    "website": "https://mitwpu.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.4,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.3,
    "adminEmail": "admissions@mitwpu.edu.in",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.6,\"research_output\":7.3,\"exposure_score\":8.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 275000,
        "hostelFeeAnnual": 227000,
        "seatCapacity": 360,
        "avgSalary": 900000,
        "medianSalary": 750000,
        "highestSalary": 5136000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.6,
        "placementPercentage": 90,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"jeeOverlapRange\":\"90-95\"}"
      }
    ]
  },
  {
    "name": "KIIT Bhubaneswar (KIIT DU)",
    "slug": "kiit-bhubaneswar",
    "state": "Odisha",
    "city": "Bhubaneswar",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://kiit.ac.in/brochure.pdf",
    "officialApplyUrl": "https://kiitee.kiit.ac.in",
    "website": "https://kiit.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "adminEmail": "admissions@kiit.ac.in",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.8,\"research_output\":7.4,\"exposure_score\":8.6}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 350000,
        "hostelFeeAnnual": 100000,
        "seatCapacity": 500,
        "avgSalary": 900000,
        "medianSalary": 750000,
        "highestSalary": 5300000,
        "minJeePercentileCutoff": 95,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.6,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "FLAME University (CS/DS UG)",
    "slug": "flame-university",
    "state": "Maharashtra",
    "city": "Pune",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.flame.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.flame.edu.in/admissions/ug",
    "website": "https://www.flame.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 7.8,
    "collegeLifeScore": 8.5,
    "curriculumScore": 8,
    "adminEmail": "admissions@flame.edu.in",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.5,\"research_output\":6.8,\"exposure_score\":8}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering (B.Sc CS/Data Science)",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 950000,
        "hostelFeeAnnual": 195000,
        "seatCapacity": 60,
        "avgSalary": 650000,
        "medianSalary": 600000,
        "highestSalary": 1200000,
        "minJeePercentileCutoff": 70,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8,
        "placementPercentage": 80,
        "metadata": "{\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "MIT Bengaluru (Manipal Institute of Technology, Bengaluru)",
    "slug": "mit-bengaluru",
    "state": "Karnataka",
    "city": "Bengaluru",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://manipal.edu/brochure.pdf",
    "officialApplyUrl": "https://manipal.edu/mit-bengaluru.html",
    "website": "https://manipal.edu/mit-bengaluru.html",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.7,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.5,
    "adminEmail": "admissions@mitb.edu",
    "metadata": "{\"infra_rating\":84,\"startup_ecosystem\":7.8,\"research_output\":7.5,\"exposure_score\":8.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 500000,
        "hostelFeeAnnual": 140000,
        "seatCapacity": 180,
        "avgSalary": 1050000,
        "medianSalary": 900000,
        "highestSalary": 5100000,
        "minJeePercentileCutoff": 94,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"92-97\"}"
      }
    ]
  },
  {
    "name": "SRM Institute of Science and Technology (SRM KTR)",
    "slug": "srm-ktr",
    "state": "Tamil Nadu",
    "city": "Kattankulathur",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.srmist.edu.in/brochure.pdf",
    "officialApplyUrl": "https://admissions.srmist.edu.in",
    "website": "https://www.srmist.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.5,
    "adminEmail": "admissions@srmist.edu.in",
    "metadata": "{\"infra_rating\":84,\"startup_ecosystem\":7.9,\"research_output\":7.4,\"exposure_score\":8.7}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 410000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 1200,
        "avgSalary": 800000,
        "medianSalary": 650000,
        "highestSalary": 5000000,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.8,
        "placementPercentage": 95,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"93-99\"}"
      }
    ]
  },
  {
    "name": "Symbiosis Institute of Technology (SIT Pune)",
    "slug": "sit-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.sitpune.edu.in/brochure.pdf",
    "officialApplyUrl": "https://www.sitpune.edu.in/first-year-admission-eligibility",
    "website": "https://www.sitpune.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.6,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "adminEmail": "admissions@sitpune.edu.in",
    "metadata": "{\"infra_rating\":80,\"startup_ecosystem\":7.5,\"research_output\":7.3,\"exposure_score\":8.5}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 400000,
        "hostelFeeAnnual": 260000,
        "seatCapacity": 180,
        "avgSalary": 1500000,
        "medianSalary": 1300000,
        "highestSalary": 3500000,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 45,
        "branchStrengthScore": 8.6,
        "placementPercentage": 97,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "NMIMS MPSTME (Mumbai)",
    "slug": "nmims-mpstme",
    "state": "Maharashtra",
    "city": "Mumbai",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
    "brochureUrl": "https://engineering.nmims.edu/brochure.pdf",
    "officialApplyUrl": "https://engineering.nmims.edu/admissions",
    "website": "https://engineering.nmims.edu",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8,
    "curriculumScore": 8.3,
    "adminEmail": "admissions@nmims.edu",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.6,\"research_output\":7.2,\"exposure_score\":8.3}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 500000,
        "hostelFeeAnnual": 300000,
        "seatCapacity": 240,
        "avgSalary": 900000,
        "medianSalary": 800000,
        "highestSalary": 2200000,
        "minJeePercentileCutoff": 88,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.4,
        "placementPercentage": 85,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"80-95\"}"
      }
    ]
  },
  {
    "name": "Amrita Vishwa Vidyapeetham (Coimbatore Campus)",
    "slug": "amrita-coimbatore",
    "state": "Tamil Nadu",
    "city": "Coimbatore",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
    "brochureUrl": "https://www.amrita.edu/brochure.pdf",
    "officialApplyUrl": "https://www.amrita.edu/admissions/engineering/",
    "website": "https://www.amrita.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "adminEmail": "admissions@amrita.edu",
    "metadata": "{\"infra_rating\":82,\"startup_ecosystem\":7.5,\"research_output\":7.8,\"exposure_score\":8.4}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 600000,
        "hostelFeeAnnual": 100000,
        "seatCapacity": 360,
        "avgSalary": 775000,
        "medianSalary": 600000,
        "highestSalary": 2500000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.7,
        "placementPercentage": 98,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"88-96\"}"
      }
    ]
  },
  {
    "name": "VIT Chennai",
    "slug": "vit-chennai",
    "state": "Tamil Nadu",
    "city": "Chennai",
    "logoUrl": "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
    "coverImageUrl": "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
    "brochureUrl": "https://chennai.vit.ac.in/files/brochure.pdf",
    "officialApplyUrl": "https://viteee.vit.ac.in",
    "website": "https://chennai.vit.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.7,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.5,
    "adminEmail": "admissions.chennai@vit.ac.in",
    "metadata": "{\"infra_rating\":83,\"startup_ecosystem\":7.8,\"research_output\":7.5,\"exposure_score\":8.6}",
    "branches": [
      {
        "branchName": "Computer Science & Engineering (Category 1)",
        "branchCode": "CSE_CAT1",
        "tuitionFeeAnnual": 195000,
        "hostelFeeAnnual": 168000,
        "seatCapacity": 120,
        "avgSalary": 1000000,
        "medianSalary": 700000,
        "highestSalary": 7200000,
        "minJeePercentileCutoff": 94,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 1\",\"jeeOverlapRange\":\"90-93\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 2)",
        "branchCode": "CSE_CAT2",
        "tuitionFeeAnnual": 290000,
        "hostelFeeAnnual": 168000,
        "seatCapacity": 120,
        "avgSalary": 1000000,
        "medianSalary": 700000,
        "highestSalary": 7200000,
        "minJeePercentileCutoff": 90,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 2\",\"jeeOverlapRange\":\"89-92\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 3)",
        "branchCode": "CSE_CAT3",
        "tuitionFeeAnnual": 375000,
        "hostelFeeAnnual": 168000,
        "seatCapacity": 120,
        "avgSalary": 1000000,
        "medianSalary": 700000,
        "highestSalary": 7200000,
        "minJeePercentileCutoff": 85,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 3\",\"jeeOverlapRange\":\"85-88\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 4)",
        "branchCode": "CSE_CAT4",
        "tuitionFeeAnnual": 400000,
        "hostelFeeAnnual": 168000,
        "seatCapacity": 120,
        "avgSalary": 1000000,
        "medianSalary": 700000,
        "highestSalary": 7200000,
        "minJeePercentileCutoff": 82,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.7,
        "placementPercentage": 90,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 4\",\"jeeOverlapRange\":\"78-84\"}"
      }
    ]
  }
];

  console.log("Seeding new colleges and branches...");
  for (const c of collegesData) {
    const { branches, adminEmail, ...collegeInfo } = c;

    const createdCollege = await prisma.college.create({
      data: {
        ...collegeInfo,
      },
    });

    console.log(`Created College: ${createdCollege.name}`);

    for (const b of branches) {
      await prisma.collegeBranch.create({
        data: {
          ...b,
          collegeId: createdCollege.id,
        },
      });
    }

    if (adminEmail) {
      const associatedAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      if (associatedAdmin) {
        await prisma.collegeAdminProfile.create({
          data: {
            userId: associatedAdmin.id,
            collegeId: createdCollege.id,
          },
        });
      }
    }
  }

  console.log("Database seeding with ALL colleges completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
