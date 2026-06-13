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
  console.log("Starting database cleanup and seeding with ALL 37 colleges...");

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
    priorityAdjustment: { active: true, boostPerRank: 0.10, maxAdjustment: 0.30 },
    careerGoalExtraDimensions: {
      PLACEMENT: [
        { key: "PLACEMENT_PERCENTAGE", label: "Branch placement rate", weight: 0.15, source: "branch_metadata", computation: "placement_percentage" },
      ],
      STARTUP: [
        { key: "STARTUP_ECOSYSTEM", label: "Startup ecosystem & incubation", weight: 0.15, source: "college_metadata", metadataKey: "startup_ecosystem" },
      ],
      HIGHER_STUDIES: [
        { key: "RESEARCH_OUTPUT", label: "Research output & publications", weight: 0.10, source: "college_metadata", metadataKey: "research_output" },
        { key: "EXPOSURE_SCORE", label: "Industry & internship exposure", weight: 0.05, source: "college_metadata", metadataKey: "exposure_score" },
      ],
      NOT_SURE: [],
    },
    budgetPenalty: { active: true, thresholdMultiplier: 1.15, basePenaltyWeight: 50.0, exponent: 2.5 },
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
      { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" },
    ],
    customScoringAttributes: [
      { key: "infra_rating", label: "Infrastructure Score", weight: 0.05, defaultValue: 80 },
    ],
  };

  await prisma.systemConfig.create({
    data: { key: "matching_rules", value: JSON.stringify(defaultMatchingRules, null, 2) },
  });

  // 3. Create users
  console.log("Creating users...");
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", salt);
  const collegePasswordHash = await bcrypt.hash("CollegePass123!", salt);

  await prisma.user.create({
    data: { email: "admin@collegematch.in", passwordHash: adminPasswordHash, role: "SUPERADMIN" },
  });

  // Create college admin accounts
  await prisma.user.create({ data: { email: "admissions@vit.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions.chennai@vit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@manipal.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@opju.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@quantum.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@dsce.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@bennett.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@upes.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@mitjaipur.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@chitkara.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@kjsce.somaiya.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@woxsen.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@snu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@mitwpu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@kiit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@flame.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@mitb.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@srmist.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@sitpune.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@nmims.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });
  await prisma.user.create({ data: { email: "admissions@amrita.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" } });

  // 4. Define ALL Colleges Data
  const collegesData = [
  {
    "name": "Amrita Vishwa Vidyapeetham (Coimbatore Campus)",
    "slug": "amrita-coimbatore",
    "state": "Tamil Nadu",
    "city": "Coimbatore",
    "officialApplyUrl": "https://www.amrita.edu/admissions/engineering/",
    "website": "https://www.amrita.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.5,\"research_output\":7.8,\"exposure_score\":7.5}",
    "adminEmail": "admissions@amrita.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 600000,
        "hostelFeeAnnual": 100000,
        "seatCapacity": 0,
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
    "name": "Bennett University (Greater Noida)",
    "slug": "bennett-greater-noida",
    "state": "Uttar Pradesh",
    "city": "Greater Noida",
    "officialApplyUrl": "https://www.bennett.edu.in/programmes/btech-cse",
    "website": "https://www.bennett.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.8,
    "metadata": "{\"infra_rating\":8.5,\"startup_ecosystem\":8.2,\"research_output\":7.8,\"exposure_score\":8.2}",
    "adminEmail": "admissions@bennett.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 403750,
        "hostelFeeAnnual": 170000,
        "seatCapacity": 0,
        "avgSalary": 942000,
        "medianSalary": 800000,
        "highestSalary": 13700000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": 55,
        "branchStrengthScore": 9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"60-88\"}"
      }
    ]
  },
  {
    "name": "BITS Goa",
    "slug": "bits-goa",
    "state": "Goa",
    "city": "Goa",
    "officialApplyUrl": "https://www.bitsadmission.com",
    "website": "https://www.bits-pilani.ac.in/goa",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 9,
    "curriculumScore": 9,
    "metadata": "{\"infra_rating\":8.7,\"startup_ecosystem\":8.8,\"research_output\":8.2,\"exposure_score\":8.8}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 592000,
        "hostelFeeAnnual": 85400,
        "seatCapacity": 0,
        "avgSalary": 2075000,
        "medianSalary": 1765000,
        "highestSalary": 6000000,
        "minJeePercentileCutoff": 98.5,
        "minClass12Cutoff": 75,
        "branchStrengthScore": 9.2,
        "placementPercentage": 90,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"95-99\"}"
      }
    ]
  },
  {
    "name": "BITS Hyderabad",
    "slug": "bits-hyderabad",
    "state": "Telangana",
    "city": "Hyderabad",
    "officialApplyUrl": "https://www.bitsadmission.com",
    "website": "https://www.bits-pilani.ac.in/hyderabad",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.8,
    "curriculumScore": 9,
    "metadata": "{\"infra_rating\":8.5,\"startup_ecosystem\":8.5,\"research_output\":8,\"exposure_score\":8.5}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 550000,
        "hostelFeeAnnual": 85400,
        "seatCapacity": 0,
        "avgSalary": 2070000,
        "medianSalary": 1800000,
        "highestSalary": 13000000,
        "minJeePercentileCutoff": 98.3,
        "minClass12Cutoff": 75,
        "branchStrengthScore": 9.1,
        "placementPercentage": 88,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"95-99\"}"
      }
    ]
  },
  {
    "name": "BITS Pilani (Pilani Campus)",
    "slug": "bits-pilani",
    "state": "Rajasthan",
    "city": "Pilani",
    "officialApplyUrl": "https://www.bitsadmission.com",
    "website": "https://www.bits-pilani.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 9.2,
    "collegeLifeScore": 9.1,
    "curriculumScore": 9,
    "metadata": "{\"infra_rating\":8.9,\"startup_ecosystem\":9.3,\"research_output\":8.6,\"exposure_score\":9.3}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 583000,
        "hostelFeeAnnual": 116000,
        "seatCapacity": 0,
        "avgSalary": 2500000,
        "medianSalary": 1800000,
        "highestSalary": 6500000,
        "minJeePercentileCutoff": 99,
        "minClass12Cutoff": 75,
        "branchStrengthScore": 9.5,
        "placementPercentage": 88,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"97-99.5\"}"
      }
    ]
  },
  {
    "name": "Chitkara University (Punjab Campus)",
    "slug": "chitkara-punjab",
    "state": "Punjab",
    "city": "Rajpura",
    "officialApplyUrl": "https://www.chitkara.edu.in/engineering/b-tech-computer-science-engineering",
    "website": "https://www.chitkara.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.3,
    "collegeLifeScore": 8.1,
    "curriculumScore": 8.1,
    "metadata": "{\"infra_rating\":8,\"startup_ecosystem\":7.4,\"research_output\":7.1,\"exposure_score\":7.4}",
    "adminEmail": "admissions@chitkara.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 240000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 0,
        "avgSalary": null,
        "medianSalary": null,
        "highestSalary": null,
        "minJeePercentileCutoff": null,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.4,
        "placementPercentage": null,
        "metadata": "{\"acceptsJEE\":true,\"acceptsBoardsOnly\":true}"
      }
    ]
  },
  {
    "name": "DAIICT Gandhinagar",
    "slug": "daiict-gandhinagar",
    "state": "Gujarat",
    "city": "Gandhinagar",
    "officialApplyUrl": "https://www.daiict.ac.in/admissions/btech",
    "website": "https://www.daiict.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.7,
    "collegeLifeScore": 8.9,
    "curriculumScore": 8.5,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":7.9,\"research_output\":7.6,\"exposure_score\":7.9}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 1800000,
        "medianSalary": 1300000,
        "highestSalary": 8200000,
        "minJeePercentileCutoff": 97.5,
        "minClass12Cutoff": null,
        "branchStrengthScore": 8.7,
        "placementPercentage": 88,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "Dayananda Sagar College of Engineering (DSCE)",
    "slug": "dsce-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://www.dsce.edu.in/admissions",
    "website": "https://www.dsce.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.6,\"research_output\":7.3,\"exposure_score\":7.6}",
    "adminEmail": "admissions@dsce.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 110000,
        "hostelFeeAnnual": 120000,
        "seatCapacity": 0,
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
    "name": "FLAME University (CS/DS UG)",
    "slug": "flame-university",
    "state": "Maharashtra",
    "city": "Pune",
    "officialApplyUrl": "https://www.flame.edu.in/admissions/ug",
    "website": "https://www.flame.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 7.8,
    "collegeLifeScore": 8.5,
    "curriculumScore": 8,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.5,\"research_output\":6.8,\"exposure_score\":7.5}",
    "adminEmail": "admissions@flame.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 950000,
        "hostelFeeAnnual": 195000,
        "seatCapacity": 0,
        "avgSalary": null,
        "medianSalary": null,
        "highestSalary": null,
        "minJeePercentileCutoff": null,
        "minClass12Cutoff": null,
        "branchStrengthScore": 8,
        "placementPercentage": null,
        "metadata": "{\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "IIIT Bangalore",
    "slug": "iiit-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://www.iiitb.ac.in/admissions/integrated-mtech",
    "website": "https://www.iiitb.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9.8,
    "collegeLifeScore": 8,
    "curriculumScore": 9.1,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":8.1,\"research_output\":8.3,\"exposure_score\":8.1}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 3700000,
        "medianSalary": 3300000,
        "highestSalary": 14500000,
        "minJeePercentileCutoff": 99,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 9.5,
        "placementPercentage": 99,
        "metadata": "{\"acceptsJEE\":true,\"jeeOverlapRange\":\"96-99\"}"
      }
    ]
  },
  {
    "name": "IIIT Hyderabad",
    "slug": "iiit-hyderabad",
    "state": "Telangana",
    "city": "Hyderabad",
    "officialApplyUrl": "https://www.iiit.ac.in/admissions/ug/",
    "website": "https://www.iiit.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9.9,
    "collegeLifeScore": 7.8,
    "curriculumScore": 9.4,
    "metadata": "{\"infra_rating\":8.6,\"startup_ecosystem\":8.5,\"research_output\":9.3,\"exposure_score\":8.5}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 3200000,
        "medianSalary": 3200000,
        "highestSalary": 12800000,
        "minJeePercentileCutoff": 99.8,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 9.7,
        "placementPercentage": 99,
        "metadata": "{\"acceptsOwnExam\":true,\"acceptsJEE\":true,\"jeeOverlapRange\":\"97-99.5\"}"
      }
    ]
  },
  {
    "name": "K J Somaiya College of Engineering",
    "slug": "kj-somaiya",
    "state": "Maharashtra",
    "city": "Mumbai",
    "officialApplyUrl": "https://kjsce.somaiya.edu/en/programme/btech-computer-engineering",
    "website": "https://kjsce.somaiya.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.5,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":7.8,\"research_output\":7.4,\"exposure_score\":7.8}",
    "adminEmail": "admissions@kjsce.somaiya.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 600000,
        "hostelFeeAnnual": 180000,
        "seatCapacity": 0,
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
    "name": "KIIT Bhubaneswar (KIIT DU)",
    "slug": "kiit-bhubaneswar",
    "state": "Odisha",
    "city": "Bhubaneswar",
    "officialApplyUrl": "https://kiitee.kiit.ac.in",
    "website": "https://kiit.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.8,\"research_output\":7.4,\"exposure_score\":7.8}",
    "adminEmail": "admissions@kiit.ac.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 350000,
        "hostelFeeAnnual": 100000,
        "seatCapacity": 0,
        "avgSalary": 900000,
        "medianSalary": 750000,
        "highestSalary": 5300000,
        "minJeePercentileCutoff": 95,
        "minClass12Cutoff": null,
        "branchStrengthScore": 8.6,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "LNMIIT Jaipur",
    "slug": "lnmiit-jaipur",
    "state": "Rajasthan",
    "city": "Jaipur",
    "officialApplyUrl": "https://www.lnmiit.ac.in/admissions/ugadmissions.html",
    "website": "https://www.lnmiit.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.9,
    "collegeLifeScore": 8.8,
    "curriculumScore": 8.6,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":7.8,\"research_output\":7.9,\"exposure_score\":7.8}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 1450000,
        "medianSalary": 1200000,
        "highestSalary": 12400000,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.6,
        "placementPercentage": 80,
        "metadata": "{\"acceptsJEE\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "Manipal Institute of Technology (MIT Manipal)",
    "slug": "mit-manipal",
    "state": "Karnataka",
    "city": "Manipal",
    "officialApplyUrl": "https://manipal.edu/mit/program-list/btech.html",
    "website": "https://manipal.edu/mit.html",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.9,
    "collegeLifeScore": 9,
    "curriculumScore": 8.6,
    "metadata": "{\"infra_rating\":8.7,\"startup_ecosystem\":7.8,\"research_output\":8,\"exposure_score\":7.8}",
    "adminEmail": "admissions@manipal.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 500000,
        "hostelFeeAnnual": 260000,
        "seatCapacity": 0,
        "avgSalary": 1500000,
        "medianSalary": 1200000,
        "highestSalary": 6925000,
        "minJeePercentileCutoff": 97.5,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.8,
        "placementPercentage": 82,
        "metadata": null
      }
    ]
  },
  {
    "name": "Manipal University Jaipur (MIT Jaipur)",
    "slug": "mit-jaipur",
    "state": "Rajasthan",
    "city": "Jaipur",
    "officialApplyUrl": "https://jaipur.manipal.edu/foe/programs/program-list/btech-computer-science-engineering.html",
    "website": "https://jaipur.manipal.edu",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.2,
    "metadata": "{\"infra_rating\":8.1,\"startup_ecosystem\":7.4,\"research_output\":7.2,\"exposure_score\":7.4}",
    "adminEmail": "admissions@mitjaipur.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 170000,
        "seatCapacity": 0,
        "avgSalary": null,
        "medianSalary": null,
        "highestSalary": null,
        "minJeePercentileCutoff": null,
        "minClass12Cutoff": 50,
        "branchStrengthScore": 8.3,
        "placementPercentage": null,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "Masters' Union",
    "slug": "masters-union",
    "state": "Haryana",
    "city": "Gurugram",
    "officialApplyUrl": "https://www.mastersunion.org/programmes",
    "website": "https://www.mastersunion.org",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9.3,
    "collegeLifeScore": 7.8,
    "curriculumScore": 9,
    "metadata": "{\"infra_rating\":8,\"startup_ecosystem\":9.4,\"research_output\":6.5,\"exposure_score\":9.4}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 756250,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 3072000,
        "medianSalary": null,
        "highestSalary": 12800000,
        "minJeePercentileCutoff": 93,
        "minClass12Cutoff": null,
        "branchStrengthScore": 8.8,
        "placementPercentage": 100,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"88-96\"}"
      }
    ]
  },
  {
    "name": "MIT Bengaluru (Manipal Institute of Technology, Bengaluru)",
    "slug": "mit-bengaluru",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://manipal.edu/mit-bengaluru.html",
    "website": "https://manipal.edu/mit-bengaluru.html",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.7,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.5,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":7.8,\"research_output\":7.5,\"exposure_score\":7.8}",
    "adminEmail": "admissions@mitb.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 500000,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
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
    "name": "MIT World Peace University (MIT-WPU Pune)",
    "slug": "mit-wpu-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "officialApplyUrl": "https://mitwpu.edu.in/programmes/btech-computer-science-engineering",
    "website": "https://mitwpu.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.4,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.6,\"research_output\":7.3,\"exposure_score\":7.6}",
    "adminEmail": "admissions@mitwpu.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 275000,
        "hostelFeeAnnual": 227000,
        "seatCapacity": 0,
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
    "name": "NMIMS MPSTME (Mumbai)",
    "slug": "nmims-mpstme",
    "state": "Maharashtra",
    "city": "Mumbai",
    "officialApplyUrl": "https://engineering.nmims.edu/admissions",
    "website": "https://engineering.nmims.edu",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.6,\"research_output\":7.2,\"exposure_score\":7.6}",
    "adminEmail": "admissions@nmims.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 500000,
        "hostelFeeAnnual": 300000,
        "seatCapacity": 0,
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
    "name": "OP Jindal University (Raigarh)",
    "slug": "op-jindal-university-raigarh",
    "state": "Chhattisgarh",
    "city": "Raigarh",
    "officialApplyUrl": "https://www.opju.ac.in/programmes/btech-cse",
    "website": "https://www.opju.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 7.8,
    "collegeLifeScore": 7.6,
    "curriculumScore": 7.8,
    "metadata": "{\"infra_rating\":7.7,\"startup_ecosystem\":7,\"research_output\":6.8,\"exposure_score\":7}",
    "adminEmail": "admissions@opju.ac.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 187500,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 500000,
        "medianSalary": null,
        "highestSalary": 700000,
        "minJeePercentileCutoff": null,
        "minClass12Cutoff": null,
        "branchStrengthScore": 7.8,
        "placementPercentage": 80,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "PES University (RR Campus)",
    "slug": "pes-university-rr",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://www.pes.edu/admissions/",
    "website": "https://www.pes.edu",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9.1,
    "collegeLifeScore": 7.6,
    "curriculumScore": 8.9,
    "metadata": "{\"infra_rating\":8.5,\"startup_ecosystem\":7.6,\"research_output\":7.8,\"exposure_score\":7.6}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 480000,
        "hostelFeeAnnual": 130000,
        "seatCapacity": 0,
        "avgSalary": 1900000,
        "medianSalary": 1250000,
        "highestSalary": 6500000,
        "minJeePercentileCutoff": 97.5,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.8,
        "placementPercentage": 88,
        "metadata": "{\"acceptsOwnExam\":true,\"acceptsStateExam\":true,\"jeeOverlapRange\":\"95-99\"}"
      }
    ]
  },
  {
    "name": "Punjab Engineering College (PEC) Chandigarh",
    "slug": "pec-chandigarh",
    "state": "Chandigarh",
    "city": "Chandigarh",
    "officialApplyUrl": "https://pec.ac.in/admissions",
    "website": "https://pec.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.4,
    "collegeLifeScore": 8.5,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":7.6,\"startup_ecosystem\":7,\"research_output\":7.7,\"exposure_score\":7}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 1670000,
        "medianSalary": 1250000,
        "highestSalary": 6100000,
        "minJeePercentileCutoff": 98.6,
        "minClass12Cutoff": 75,
        "branchStrengthScore": 8.4,
        "placementPercentage": 78,
        "metadata": "{\"acceptsJEE\":true,\"jeeOverlapRange\":\"97-99.5\"}"
      }
    ]
  },
  {
    "name": "Quantum University (Roorkee)",
    "slug": "quantum-university-roorkee",
    "state": "Uttarakhand",
    "city": "Roorkee",
    "officialApplyUrl": "https://quantumuniversity.edu.in/admissions/btech",
    "website": "https://quantumuniversity.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 7.5,
    "collegeLifeScore": 7.8,
    "curriculumScore": 7.6,
    "metadata": "{\"infra_rating\":7.4,\"startup_ecosystem\":7,\"research_output\":6.6,\"exposure_score\":7}",
    "adminEmail": "admissions@quantum.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 135000,
        "hostelFeeAnnual": 75000,
        "seatCapacity": 0,
        "avgSalary": null,
        "medianSalary": null,
        "highestSalary": null,
        "minJeePercentileCutoff": null,
        "minClass12Cutoff": null,
        "branchStrengthScore": 7.5,
        "placementPercentage": null,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true}"
      }
    ]
  },
  {
    "name": "Ramaiah Institute of Technology (MSRIT)",
    "slug": "msrit-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://www.msrit.edu/admissions.html",
    "website": "https://www.msrit.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.7,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.6,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":7.4,\"research_output\":7.7,\"exposure_score\":7.4}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 260000,
        "hostelFeeAnnual": 130000,
        "seatCapacity": 0,
        "avgSalary": null,
        "medianSalary": null,
        "highestSalary": null,
        "minJeePercentileCutoff": 97.5,
        "minClass12Cutoff": 45,
        "branchStrengthScore": 8.6,
        "placementPercentage": 95,
        "metadata": "{\"acceptsStateExam\":true,\"acceptsJEE\":true,\"jeeOverlapRange\":\"95-98\"}"
      }
    ]
  },
  {
    "name": "RV College of Engineering",
    "slug": "rvce-bangalore",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://rvce.edu.in/admissions",
    "website": "https://rvce.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.4,
    "curriculumScore": 8.7,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":7.2,\"research_output\":7.6,\"exposure_score\":7.2}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 220000,
        "hostelFeeAnnual": 113000,
        "seatCapacity": 0,
        "avgSalary": 1900000,
        "medianSalary": 1200000,
        "highestSalary": 6000000,
        "minJeePercentileCutoff": 98,
        "minClass12Cutoff": 45,
        "branchStrengthScore": 8.6,
        "placementPercentage": 88,
        "metadata": "{\"acceptsStateExam\":true,\"jeeOverlapRange\":\"96-99\"}"
      }
    ]
  },
  {
    "name": "Scaler School of Technology",
    "slug": "scaler-sot",
    "state": "Karnataka",
    "city": "Bengaluru",
    "officialApplyUrl": "https://www.scaler.com/school-of-technology/admissions",
    "website": "https://www.scaler.com/school-of-technology",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 7,
    "curriculumScore": 9.2,
    "metadata": "{\"infra_rating\":8,\"startup_ecosystem\":8.5,\"research_output\":6.8,\"exposure_score\":8.5}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 406250,
        "hostelFeeAnnual": 114000,
        "seatCapacity": 0,
        "avgSalary": 2100000,
        "medianSalary": null,
        "highestSalary": 15000000,
        "minJeePercentileCutoff": 95,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 88,
        "metadata": "{\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"90-97\"}"
      }
    ]
  },
  {
    "name": "Shiv Nadar University (Greater Noida)",
    "slug": "snu-greater-noida",
    "state": "Uttar Pradesh",
    "city": "Greater Noida",
    "officialApplyUrl": "https://www.snu.edu.in/programs/btech-computer-science-and-engineering",
    "website": "https://www.snu.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 9,
    "collegeLifeScore": 8.5,
    "curriculumScore": 8.8,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":8,\"research_output\":8,\"exposure_score\":8}",
    "adminEmail": "admissions@snu.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 0,
        "hostelFeeAnnual": 0,
        "seatCapacity": 0,
        "avgSalary": 1082000,
        "medianSalary": 845000,
        "highestSalary": 5079000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": null,
        "branchStrengthScore": 8.9,
        "placementPercentage": 88,
        "metadata": "{\"acceptsJEE\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"90-96\"}"
      }
    ]
  },
  {
    "name": "SRM Institute of Science and Technology (SRM KTR)",
    "slug": "srm-ktr",
    "state": "Tamil Nadu",
    "city": "Kattankulathur",
    "officialApplyUrl": "https://admissions.srmist.edu.in",
    "website": "https://www.srmist.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.5,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":7.9,\"research_output\":7.4,\"exposure_score\":7.9}",
    "adminEmail": "admissions@srmist.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 410000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 0,
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
    "officialApplyUrl": "https://www.sitpune.edu.in/first-year-admission-eligibility",
    "website": "https://www.sitpune.edu.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.6,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8,\"startup_ecosystem\":7.5,\"research_output\":7.3,\"exposure_score\":7.5}",
    "adminEmail": "admissions@sitpune.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 400000,
        "hostelFeeAnnual": 260000,
        "seatCapacity": 0,
        "avgSalary": 1500000,
        "medianSalary": 1300000,
        "highestSalary": null,
        "minJeePercentileCutoff": 96,
        "minClass12Cutoff": 45,
        "branchStrengthScore": 8.6,
        "placementPercentage": 97,
        "metadata": "{\"acceptsJEE\":true,\"acceptsStateExam\":true,\"acceptsOwnExam\":true,\"jeeOverlapRange\":\"93-97\"}"
      }
    ]
  },
  {
    "name": "Thapar Institute of Engineering and Technology",
    "slug": "thapar-patiala",
    "state": "Punjab",
    "city": "Patiala",
    "officialApplyUrl": "https://admissions.thapar.edu",
    "website": "https://www.thapar.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.8,
    "collegeLifeScore": 8.7,
    "curriculumScore": 8.5,
    "metadata": "{\"infra_rating\":8.4,\"startup_ecosystem\":8,\"research_output\":7.8,\"exposure_score\":8}",
    "adminEmail": null,
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 610000,
        "hostelFeeAnnual": 150000,
        "seatCapacity": 0,
        "avgSalary": 1400000,
        "medianSalary": 1150000,
        "highestSalary": 5800000,
        "minJeePercentileCutoff": 97,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.5,
        "placementPercentage": 85,
        "metadata": "{\"acceptsJEE\":true,\"jeeOverlapRange\":\"95-99\"}"
      }
    ]
  },
  {
    "name": "UPES Dehradun",
    "slug": "upes-dehradun",
    "state": "Uttarakhand",
    "city": "Dehradun",
    "officialApplyUrl": "https://www.upes.ac.in/schools/school-of-computer-science/btech-computer-science-engineering",
    "website": "https://www.upes.ac.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.6,
    "collegeLifeScore": 8.1,
    "curriculumScore": 8.4,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":8,\"research_output\":7.6,\"exposure_score\":8}",
    "adminEmail": "admissions@upes.ac.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 425000,
        "hostelFeeAnnual": 180000,
        "seatCapacity": 0,
        "avgSalary": 841000,
        "medianSalary": null,
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
    "name": "Vishwakarma Institute of Technology (VIT Pune)",
    "slug": "vit-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "officialApplyUrl": "https://www.vit.edu/admissions",
    "website": "https://www.vit.edu",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8.2,\"startup_ecosystem\":7.5,\"research_output\":7.2,\"exposure_score\":7.5}",
    "adminEmail": "admissions@vit.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 212000,
        "hostelFeeAnnual": 125000,
        "seatCapacity": 0,
        "avgSalary": null,
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
    "name": "VIT Chennai",
    "slug": "vit-chennai",
    "state": "Tamil Nadu",
    "city": "Chennai",
    "officialApplyUrl": "https://viteee.vit.ac.in",
    "website": "https://www.vit.ac.in/chennai",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.3,
    "collegeLifeScore": 8,
    "curriculumScore": 8.3,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":7.2,\"research_output\":7,\"exposure_score\":7.2}",
    "adminEmail": "admissions.chennai@vit.ac.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering (Category 1)",
        "branchCode": "CSE_CAT1",
        "tuitionFeeAnnual": 195000,
        "hostelFeeAnnual": 168000,
        "seatCapacity": 0,
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
        "seatCapacity": 0,
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
        "seatCapacity": 0,
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
        "seatCapacity": 0,
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
  },
  {
    "name": "VIT Vellore",
    "slug": "vit-vellore",
    "state": "Tamil Nadu",
    "city": "Vellore",
    "officialApplyUrl": "https://viteee.vit.ac.in",
    "website": "https://www.vit.ac.in",
    "isPartner": false,
    "isNewGen": false,
    "commissionRate": 0,
    "placementScore": 8.5,
    "collegeLifeScore": 8.2,
    "curriculumScore": 8.4,
    "metadata": "{\"infra_rating\":8.5,\"startup_ecosystem\":7.5,\"research_output\":7,\"exposure_score\":7.5}",
    "adminEmail": "admissions@vit.edu",
    "branches": [
      {
        "branchName": "Computer Science & Engineering (Category 1)",
        "branchCode": "CSE_CAT1",
        "tuitionFeeAnnual": 195000,
        "hostelFeeAnnual": 160000,
        "seatCapacity": 0,
        "avgSalary": 990000,
        "medianSalary": 899000,
        "highestSalary": 8800000,
        "minJeePercentileCutoff": 97,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 1\",\"jeeOverlapRange\":\"97-99\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 2)",
        "branchCode": "CSE_CAT2",
        "tuitionFeeAnnual": 290000,
        "hostelFeeAnnual": 160000,
        "seatCapacity": 0,
        "avgSalary": 990000,
        "medianSalary": 899000,
        "highestSalary": 8800000,
        "minJeePercentileCutoff": 95,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 2\",\"jeeOverlapRange\":\"94-96\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 3)",
        "branchCode": "CSE_CAT3",
        "tuitionFeeAnnual": 375000,
        "hostelFeeAnnual": 160000,
        "seatCapacity": 0,
        "avgSalary": 990000,
        "medianSalary": 899000,
        "highestSalary": 8800000,
        "minJeePercentileCutoff": 92,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 3\",\"jeeOverlapRange\":\"90-93\"}"
      },
      {
        "branchName": "Computer Science & Engineering (Category 4)",
        "branchCode": "CSE_CAT4",
        "tuitionFeeAnnual": 400000,
        "hostelFeeAnnual": 160000,
        "seatCapacity": 0,
        "avgSalary": 990000,
        "medianSalary": 899000,
        "highestSalary": 8800000,
        "minJeePercentileCutoff": 90,
        "minClass12Cutoff": 60,
        "branchStrengthScore": 8.9,
        "placementPercentage": 92,
        "metadata": "{\"acceptsOwnExam\":true,\"feeCategory\":\"Category 4\",\"jeeOverlapRange\":\"85-89\"}"
      }
    ]
  },
  {
    "name": "Woxsen University (Hyderabad)",
    "slug": "woxsen-hyderabad",
    "state": "Telangana",
    "city": "Hyderabad",
    "officialApplyUrl": "https://woxsen.edu.in/admissions",
    "website": "https://woxsen.edu.in",
    "isPartner": false,
    "isNewGen": true,
    "commissionRate": 0,
    "placementScore": 8.2,
    "collegeLifeScore": 8.3,
    "curriculumScore": 8.4,
    "metadata": "{\"infra_rating\":8.3,\"startup_ecosystem\":7.8,\"research_output\":7.2,\"exposure_score\":7.8}",
    "adminEmail": "admissions@woxsen.edu.in",
    "branches": [
      {
        "branchName": "Computer Science & Engineering",
        "branchCode": "CSE",
        "tuitionFeeAnnual": 406250,
        "hostelFeeAnnual": 510000,
        "seatCapacity": 0,
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
    "name": "DY Patil College of Engineering (Akurdi)",
    "slug": "dypatil-pune",
    "state": "Maharashtra",
    "city": "Pune",
    "officialApplyUrl": "https://dypcoeakurdi.ac.in/admissions",
    "website": "https://dypcoeakurdi.ac.in",
    "isPartner": true,
    "isNewGen": false,
    "commissionRate": 15000,
    "placementScore": 7.7,
    "collegeLifeScore": 8.4,
    "curriculumScore": 7.9,
    "metadata": "{\"nirf_ranking\":150,\"infra_rating\":84,\"startup_ecosystem\":6,\"research_output\":5.5,\"international_exposure\":5}",
    "adminEmail": null,
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
  }
];

  console.log("Seeding colleges and branches...");
  for (const c of collegesData) {
    const { branches, adminEmail, ...collegeInfo } = c;

    const createdCollege = await prisma.college.create({ data: { ...collegeInfo } });
    console.log(`  Created College: ${createdCollege.name}`);

    for (const b of branches) {
      await prisma.collegeBranch.create({
        data: { ...b, collegeId: createdCollege.id },
      });
    }

    if (adminEmail) {
      const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (admin) {
        await prisma.collegeAdminProfile.create({
          data: { userId: admin.id, collegeId: createdCollege.id },
        });
      }
    }
  }

  console.log("Database seeding completed successfully with all colleges!");
}

main()
  .catch((e) => { console.error("Error running seed script:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
