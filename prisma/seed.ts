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
  console.log("Starting database cleanup and seeding with requested 5 colleges...");

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

  // 4. Define 5 Colleges Data
  const collegesData = [
    {
      name: "Vishwakarma Institute of Technology (VIT Pune)",
      slug: "vit-pune",
      state: "Maharashtra",
      city: "Pune",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
      brochureUrl: "https://www.vit.edu/brochure.pdf",
      officialApplyUrl: "https://www.vit.edu/admissions",
      website: "https://www.vit.edu",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.5,
      collegeLifeScore: 8.2,
      curriculumScore: 8.3,
      adminEmail: "admissions@vit.edu",
      metadata: JSON.stringify({
        infra_rating: 82,
        startup_ecosystem: 7.5,
        research_output: 7.2,
        exposure_score: 8.4,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 212000,
          hostelFeeAnnual: 125000,
          seatCapacity: 240,
          avgSalary: 950000, // Non-null default to support ROI
          medianSalary: 950000,
          highestSalary: 4500000,
          minJeePercentileCutoff: 96.0,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.6,
          placementPercentage: 95.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsStateExam: true, jeeOverlapRange: "94-98" }),
        }
      ]
    },
    {
      name: "UPES Dehradun",
      slug: "upes-dehradun",
      state: "Uttarakhand",
      city: "Dehradun",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
      brochureUrl: "https://www.upes.ac.in/brochure.pdf",
      officialApplyUrl: "https://www.upes.ac.in/schools/school-of-computer-science/btech-computer-science-engineering",
      website: "https://www.upes.ac.in",
      isPartner: false,
      isNewGen: true,
      commissionRate: 0.0,
      placementScore: 8.6,
      collegeLifeScore: 8.1,
      curriculumScore: 8.4,
      adminEmail: "admissions@upes.ac.in",
      metadata: JSON.stringify({
        infra_rating: 83,
        startup_ecosystem: 8.0,
        research_output: 7.6,
        exposure_score: 8.7,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 425000,
          hostelFeeAnnual: 180000,
          seatCapacity: 600,
          avgSalary: 841000,
          medianSalary: 750000,
          highestSalary: 5009000,
          minJeePercentileCutoff: 90.0,
          minClass12Cutoff: 55.0,
          branchStrengthScore: 8.7,
          placementPercentage: 90.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true, acceptsBoardsOnly: true, jeeOverlapRange: "85-95" }),
        }
      ]
    },
    {
      name: "Manipal University Jaipur (MIT Jaipur)",
      slug: "mit-jaipur",
      state: "Rajasthan",
      city: "Jaipur",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
      brochureUrl: "https://jaipur.manipal.edu/brochure.pdf",
      officialApplyUrl: "https://jaipur.manipal.edu/foe/programs/program-list/btech-computer-science-engineering.html",
      website: "https://jaipur.manipal.edu",
      isPartner: false,
      isNewGen: true,
      commissionRate: 0.0,
      placementScore: 8.2,
      collegeLifeScore: 8.4,
      curriculumScore: 8.2,
      adminEmail: "admissions@mitjaipur.edu",
      metadata: JSON.stringify({
        infra_rating: 81,
        startup_ecosystem: 7.4,
        research_output: 7.2,
        exposure_score: 8.3,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 350000, // Estimated based on other MIT fees if blank
          hostelFeeAnnual: 170000,
          seatCapacity: 300,
          avgSalary: 750000, // Reasonable fallback default
          medianSalary: 700000,
          highestSalary: 2200000,
          minJeePercentileCutoff: 80.0, // Reasonable fallback cutoff
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.3,
          placementPercentage: 80.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsOwnExam: true }),
        }
      ]
    },
    {
      name: "Chitkara University (Punjab Campus)",
      slug: "chitkara-punjab",
      state: "Punjab",
      city: "Rajpura",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
      brochureUrl: "https://www.chitkara.edu.in/brochure.pdf",
      officialApplyUrl: "https://www.chitkara.edu.in/engineering/b-tech-computer-science-engineering",
      website: "https://www.chitkara.edu.in",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.3,
      collegeLifeScore: 8.1,
      curriculumScore: 8.1,
      adminEmail: "admissions@chitkara.edu.in",
      metadata: JSON.stringify({
        infra_rating: 80,
        startup_ecosystem: 7.4,
        research_output: 7.1,
        exposure_score: 8.2,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 240000,
          hostelFeeAnnual: 150000,
          seatCapacity: 400,
          avgSalary: 650000, // Reasonable fallback
          medianSalary: 600000,
          highestSalary: 1800000,
          minJeePercentileCutoff: 75.0,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.4,
          placementPercentage: 80.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsBoardsOnly: true }),
        }
      ]
    },
    {
      name: "K J Somaiya College of Engineering",
      slug: "kj-somaiya",
      state: "Maharashtra",
      city: "Mumbai",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
      brochureUrl: "https://kjsce.somaiya.edu/brochure.pdf",
      officialApplyUrl: "https://kjsce.somaiya.edu/en/programme/btech-computer-engineering",
      website: "https://kjsce.somaiya.edu",
      isPartner: false,
      isNewGen: false,
      commissionRate: 0.0,
      placementScore: 8.8,
      collegeLifeScore: 8.3,
      curriculumScore: 8.5,
      adminEmail: "admissions@kjsce.somaiya.edu",
      metadata: JSON.stringify({
        infra_rating: 84,
        startup_ecosystem: 7.8,
        research_output: 7.4,
        exposure_score: 8.7,
      }),
      branches: [
        {
          branchName: "Computer Science & Engineering",
          branchCode: "CSE",
          tuitionFeeAnnual: 600000,
          hostelFeeAnnual: 180000,
          seatCapacity: 120,
          avgSalary: 945000,
          medianSalary: 750000,
          highestSalary: 5800000,
          minJeePercentileCutoff: 95.0,
          minClass12Cutoff: 50.0,
          branchStrengthScore: 8.7,
          placementPercentage: 93.0,
          metadata: JSON.stringify({ acceptsJEE: true, acceptsStateExam: true, jeeOverlapRange: "92-97" }),
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

  console.log("Database seeding with custom 5 colleges completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
