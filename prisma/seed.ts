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
  console.log("Starting database cleanup and seeding with 4 new colleges...");

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
    data: { email: "admissions@mit.edu", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
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

  // 4. Define 4 Colleges Data
  const collegesData = [
    {
      name: "Manipal Institute of Technology (MIT Manipal)",
      slug: "mit-manipal",
      state: "Karnataka",
      city: "Manipal",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
      brochureUrl: "https://manipal.edu/brochure.pdf",
      officialApplyUrl: "https://manipal.edu/mit/program-list/btech.html",
      website: "https://manipal.edu/mit.html",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.9,
      collegeLifeScore: 9.0,
      curriculumScore: 8.6,
      adminEmail: "admissions@mit.edu",
      metadata: JSON.stringify({
        infra_rating: 87,
        startup_ecosystem: 7.8,
        research_output: 8.0,
        exposure_score: 8.8,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 500000,
          hostelFeeAnnual: 260000,
          seatCapacity: 400,
          avgSalary: 1500000,
          medianSalary: 1200000,
          highestSalary: 6925000,
          minJeePercentileCutoff: 97.5,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.8,
          placementPercentage: 82.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true, jeeOverlapRange: "96-99" }),
        }
      ]
    },
    {
      name: "Symbiosis Institute of Technology (SIT Pune)",
      slug: "sit-pune",
      state: "Maharashtra",
      city: "Pune",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
      brochureUrl: "https://www.sitpune.edu.in/brochure.pdf",
      officialApplyUrl: "https://www.sitpune.edu.in/first-year-admission-eligibility",
      website: "https://www.sitpune.edu.in",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.6,
      collegeLifeScore: 8.2,
      curriculumScore: 8.3,
      adminEmail: "admissions@sitpune.edu.in",
      metadata: JSON.stringify({
        infra_rating: 80,
        startup_ecosystem: 7.5,
        research_output: 7.3,
        exposure_score: 8.5,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 400000,
          hostelFeeAnnual: 260000,
          seatCapacity: 180,
          avgSalary: 1500000,
          medianSalary: 1300000,
          highestSalary: 3500000, // Benchmark typical high package for SIT Pune
          minJeePercentileCutoff: 96.0,
          minClass12Cutoff: 45.0,
          branchStrengthScore: 8.6,
          placementPercentage: 97.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsStateExam: true, acceptsOwnExam: true, jeeOverlapRange: "93-97" }),
        }
      ]
    },
    {
      name: "NMIMS MPSTME (Mumbai)",
      slug: "nmims-mpstme",
      state: "Maharashtra",
      city: "Mumbai",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
      brochureUrl: "https://engineering.nmims.edu/brochure.pdf",
      officialApplyUrl: "https://engineering.nmims.edu/admissions",
      website: "https://engineering.nmims.edu",
      isPartner: false,
      isNewGen: true,
      commissionRate: 0.0,
      placementScore: 8.2,
      collegeLifeScore: 8.0,
      curriculumScore: 8.3,
      adminEmail: "admissions@nmims.edu",
      metadata: JSON.stringify({
        infra_rating: 82,
        startup_ecosystem: 7.6,
        research_output: 7.2,
        exposure_score: 8.3,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 500000,
          hostelFeeAnnual: 300000,
          seatCapacity: 240,
          avgSalary: 900000,
          medianSalary: 800000,
          highestSalary: 2200000,
          minJeePercentileCutoff: 88.0,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.4,
          placementPercentage: 85.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true, jeeOverlapRange: "80-95" }),
        }
      ]
    },
    {
      name: "Amrita Vishwa Vidyapeetham (Coimbatore Campus)",
      slug: "amrita-coimbatore",
      state: "Tamil Nadu",
      city: "Coimbatore",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
      brochureUrl: "https://www.amrita.edu/brochure.pdf",
      officialApplyUrl: "https://www.amrita.edu/admissions/engineering/",
      website: "https://www.amrita.edu",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.5,
      collegeLifeScore: 8.3,
      curriculumScore: 8.4,
      adminEmail: "admissions@amrita.edu",
      metadata: JSON.stringify({
        infra_rating: 82,
        startup_ecosystem: 7.5,
        research_output: 7.8,
        exposure_score: 8.4,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 600000,
          hostelFeeAnnual: 100000,
          seatCapacity: 360,
          avgSalary: 775000,
          medianSalary: 600000,
          highestSalary: 2500000,
          minJeePercentileCutoff: 92.0,
          minClass12Cutoff: 60.0,
          branchStrengthScore: 8.7,
          placementPercentage: 98.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true, jeeOverlapRange: "88-96" }),
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

  console.log("Database seeding with custom 4 colleges completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
