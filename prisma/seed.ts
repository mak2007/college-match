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
  console.log("Starting database cleanup and seeding with VIT Vellore...");

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
    data: { email: "admissions@vit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });

  // 4. Define VIT Vellore Data
  const collegesData = [
    {
      name: "Vellore Institute of Technology (VIT)",
      slug: "vit-vellore",
      state: "Tamil Nadu",
      city: "Vellore",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
      brochureUrl: "https://vit.ac.in/files/brochure.pdf",
      officialApplyUrl: "https://viteee.vit.ac.in",
      website: "https://vit.ac.in",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 9.2,
      collegeLifeScore: 8.8,
      curriculumScore: 9.0,
      adminEmail: "admissions@vit.ac.in",
      metadata: JSON.stringify({
        infra_rating: 90,
        startup_ecosystem: 8.5,
        research_output: 7.0,
        exposure_score: 8.9,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering (Category 1)",
          branchCode: "CSE_CAT1",
          tuitionFeeAnnual: 195000,
          hostelFeeAnnual: 160000,
          seatCapacity: 240,
          avgSalary: 990000,
          medianSalary: 899000,
          highestSalary: 8800000,
          minJeePercentileCutoff: 97.0,
          minClass12Cutoff: 60.0,
          branchStrengthScore: 8.9,
          placementPercentage: 92.0,
          metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 1", jeeOverlapRange: "95-99" }),
        },
        {
          branchName: "Computer Science & Engineering (Category 2)",
          branchCode: "CSE_CAT2",
          tuitionFeeAnnual: 290000,
          hostelFeeAnnual: 160000,
          seatCapacity: 240,
          avgSalary: 990000,
          medianSalary: 899000,
          highestSalary: 8800000,
          minJeePercentileCutoff: 95.0,
          minClass12Cutoff: 60.0,
          branchStrengthScore: 8.9,
          placementPercentage: 92.0,
          metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 2", jeeOverlapRange: "93-97" }),
        },
        {
          branchName: "Computer Science & Engineering (Category 3)",
          branchCode: "CSE_CAT3",
          tuitionFeeAnnual: 375000,
          hostelFeeAnnual: 160000,
          seatCapacity: 240,
          avgSalary: 990000,
          medianSalary: 899000,
          highestSalary: 8800000,
          minJeePercentileCutoff: 92.0,
          minClass12Cutoff: 60.0,
          branchStrengthScore: 8.9,
          placementPercentage: 92.0,
          metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 3", jeeOverlapRange: "90-95" }),
        },
        {
          branchName: "Computer Science & Engineering (Category 4)",
          branchCode: "CSE_CAT4",
          tuitionFeeAnnual: 400000,
          hostelFeeAnnual: 160000,
          seatCapacity: 240,
          avgSalary: 990000,
          medianSalary: 899000,
          highestSalary: 8800000,
          minJeePercentileCutoff: 90.0,
          minClass12Cutoff: 60.0,
          branchStrengthScore: 8.9,
          placementPercentage: 92.0,
          metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 4", jeeOverlapRange: "88-93" }),
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

  console.log("Database seeding with VIT Vellore completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
