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
  console.log("Starting database cleanup and seeding with requested 3 colleges...");

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
    data: { email: "admissions@woxsen.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@snu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });
  await prisma.user.create({
    data: { email: "admissions@mitwpu.edu.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });

  // 4. Define 3 Colleges Data
  const collegesData = [
    {
      name: "Woxsen University (Hyderabad)",
      slug: "woxsen-hyderabad",
      state: "Telangana",
      city: "Hyderabad",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
      brochureUrl: "https://woxsen.edu.in/brochure.pdf",
      officialApplyUrl: "https://woxsen.edu.in/admissions",
      website: "https://woxsen.edu.in",
      isPartner: false,
      isNewGen: true,
      commissionRate: 0.0,
      placementScore: 8.2,
      collegeLifeScore: 8.3,
      curriculumScore: 8.4,
      adminEmail: "admissions@woxsen.edu.in",
      metadata: JSON.stringify({
        infra_rating: 83,
        startup_ecosystem: 7.8,
        research_output: 7.2,
        exposure_score: 8.4,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 406250,
          hostelFeeAnnual: 510000,
          seatCapacity: 120,
          avgSalary: 860000,
          medianSalary: 750000,
          highestSalary: 2400000,
          minJeePercentileCutoff: 85.0,
          minClass12Cutoff: 55.0,
          branchStrengthScore: 8.6,
          placementPercentage: 90.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsStateExam: true, acceptsOwnExam: true, jeeOverlapRange: "80-92" }),
        }
      ]
    },
    {
      name: "Shiv Nadar University (Greater Noida)",
      slug: "snu-greater-noida",
      state: "Uttar Pradesh",
      city: "Greater Noida",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
      brochureUrl: "https://www.snu.edu.in/brochure.pdf",
      officialApplyUrl: "https://www.snu.edu.in/programs/btech-computer-science-and-engineering",
      website: "https://www.snu.edu.in",
      isPartner: false,
      isNewGen: true,
      commissionRate: 0.0,
      placementScore: 9.0,
      collegeLifeScore: 8.5,
      curriculumScore: 8.8,
      adminEmail: "admissions@snu.edu.in",
      metadata: JSON.stringify({
        infra_rating: 84,
        startup_ecosystem: 8.0,
        research_output: 8.0,
        exposure_score: 8.9,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 400000, // Estimated standard SNU BTech CSE fee
          hostelFeeAnnual: 150000, // Estimated SNU BTech CSE hostel fee
          seatCapacity: 180,
          avgSalary: 1082000,
          medianSalary: 845000,
          highestSalary: 5079000,
          minJeePercentileCutoff: 92.0,
          minClass12Cutoff: 60.0, // Baseline typical cutoff
          branchStrengthScore: 8.9,
          placementPercentage: 88.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true, jeeOverlapRange: "90-96" }),
        }
      ]
    },
    {
      name: "MIT World Peace University (MIT-WPU Pune)",
      slug: "mit-wpu-pune",
      state: "Maharashtra",
      city: "Pune",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
      brochureUrl: "https://mitwpu.edu.in/brochure.pdf",
      officialApplyUrl: "https://mitwpu.edu.in/programmes/btech-computer-science-engineering",
      website: "https://mitwpu.edu.in",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.4,
      collegeLifeScore: 8.4,
      curriculumScore: 8.3,
      adminEmail: "admissions@mitwpu.edu.in",
      metadata: JSON.stringify({
        infra_rating: 82,
        startup_ecosystem: 7.6,
        research_output: 7.3,
        exposure_score: 8.5,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 275000,
          hostelFeeAnnual: 227000,
          seatCapacity: 360,
          avgSalary: 900000,
          medianSalary: 750000,
          highestSalary: 5136000,
          minJeePercentileCutoff: 92.0,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.6,
          placementPercentage: 90.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsStateExam: true, jeeOverlapRange: "90-95" }),
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

  console.log("Database seeding with custom 3 colleges completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
