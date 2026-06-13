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
  console.log("Starting seed script...");

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
      { key: "nirf_ranking", label: "NIRF Ranking Score", weight: 0.03, defaultValue: 70 },
      { key: "infra_rating", label: "Infrastructure Score", weight: 0.02, defaultValue: 80 }
    ]
  };

  await prisma.systemConfig.create({
    data: {
      key: "matching_rules",
      value: JSON.stringify(defaultMatchingRules, null, 2),
    },
  });
  console.log("Seeded matching rules configuration.");

  // 3. Create Superadmin User
  console.log("Creating users...");
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", salt);
  const collegePasswordHash = await bcrypt.hash("CollegePass123!", salt);

  const superadmin = await prisma.user.create({
    data: {
      email: "admin@collegematch.in",
      passwordHash: adminPasswordHash,
      role: "SUPERADMIN",
    },
  });
  console.log(`Superadmin user created: ${superadmin.email}`);

  // Create college admin accounts
  await prisma.user.create({
    data: {
      email: "admissions@vit.edu",
      passwordHash: collegePasswordHash,
      role: "COLLEGE_ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      email: "admissions@manipal.edu",
      passwordHash: collegePasswordHash,
      role: "COLLEGE_ADMIN",
    },
  });

  // 4. Define 15+ Private Engineering Colleges
  const collegesData = [
    {
      name: "Vellore Institute of Technology (VIT)",
      slug: "vit-vellore",
      state: "Tamil Nadu",
      city: "Vellore",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
      brochureUrl: "https://vit.ac.in/files/brochure.pdf",
      officialApplyUrl: "https://viteee.vit.ac.in/",
      website: "https://vit.ac.in",
      isPartner: true,
      commissionRate: 25000.00,
      placementScore: 9.2,
      collegeLifeScore: 8.8,
      curriculumScore: 9.0,
      adminEmail: "admissions@vit.edu",
      metadata: JSON.stringify({ nirf_ranking: 11, infra_rating: 90, startup_ecosystem: 8.5, research_output: 7.0, international_exposure: 6.5 }),
      branches: [
        { branchName: "Computer Science & Engineering", branchCode: "CSE", tuitionFeeAnnual: 198000, hostelFeeAnnual: 95000, seatCapacity: 1200, avgSalary: 920000, medianSalary: 850000, highestSalary: 4400000, minJeePercentileCutoff: 94.5, minClass12Cutoff: 85.0, branchStrengthScore: 9.5, placementPercentage: 95.0, metadata: JSON.stringify({ lab_rating: 9.2 }) },
        { branchName: "Electronics & Communication Engineering", branchCode: "ECE", tuitionFeeAnnual: 195000, hostelFeeAnnual: 95000, seatCapacity: 600, avgSalary: 750000, medianSalary: 700000, highestSalary: 2200000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 80.0, branchStrengthScore: 8.8, placementPercentage: 88.0, metadata: JSON.stringify({ lab_rating: 8.5 }) },
        { branchName: "Information Technology", branchCode: "IT", tuitionFeeAnnual: 198000, hostelFeeAnnual: 95000, seatCapacity: 300, avgSalary: 860000, medianSalary: 800000, highestSalary: 3200000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 82.0, branchStrengthScore: 9.2, placementPercentage: 92.0, metadata: JSON.stringify({ lab_rating: 9.0 }) },
      ]
    },
    {
      name: "Manipal Institute of Technology (MIT)",
      slug: "mit-manipal",
      state: "Karnataka",
      city: "Manipal",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=400&fit=crop",
      brochureUrl: "https://manipal.edu/brochure.pdf",
      officialApplyUrl: "https://apply.manipal.edu/",
      website: "https://manipal.edu",
      isPartner: true,
      commissionRate: 30000.00,
      placementScore: 8.9,
      collegeLifeScore: 9.6,
      curriculumScore: 8.7,
      adminEmail: "admissions@manipal.edu",
      metadata: JSON.stringify({ nirf_ranking: 21, infra_rating: 95, startup_ecosystem: 9.0, research_output: 8.5, international_exposure: 9.2 }),
      branches: [
        { branchName: "Computer Science & Engineering", branchCode: "CSE", tuitionFeeAnnual: 335000, hostelFeeAnnual: 110000, seatCapacity: 400, avgSalary: 1250000, medianSalary: 1100000, highestSalary: 5400000, minJeePercentileCutoff: 96.0, minClass12Cutoff: 88.0, branchStrengthScore: 9.4, placementPercentage: 97.0, metadata: JSON.stringify({ lab_rating: 9.5 }) },
        { branchName: "Electronics & Communication Engineering", branchCode: "ECE", tuitionFeeAnnual: 290000, hostelFeeAnnual: 110000, seatCapacity: 240, avgSalary: 900000, medianSalary: 820000, highestSalary: 2800000, minJeePercentileCutoff: 91.5, minClass12Cutoff: 80.0, branchStrengthScore: 8.9, placementPercentage: 90.0, metadata: JSON.stringify({ lab_rating: 8.8 }) },
      ]
    },
    {
      name: "RV College of Engineering (RVCE)",
      slug: "rvce-bangalore",
      state: "Karnataka",
      city: "Bengaluru",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop",
      brochureUrl: "https://rvce.edu.in/brochure.pdf",
      officialApplyUrl: "https://rvce.edu.in/admissions",
      website: "https://rvce.edu.in",
      isPartner: false,
      commissionRate: 0.00,
      placementScore: 9.6,
      collegeLifeScore: 7.2,
      curriculumScore: 8.5,
      metadata: JSON.stringify({ nirf_ranking: 9, infra_rating: 78, startup_ecosystem: 7.5, research_output: 9.0, international_exposure: 7.0 }),
      branches: [
        { branchName: "Computer Science & Engineering", branchCode: "CSE", tuitionFeeAnnual: 250000, hostelFeeAnnual: 85000, seatCapacity: 240, avgSalary: 1540000, medianSalary: 1400000, highestSalary: 5700000, minJeePercentileCutoff: 97.2, minClass12Cutoff: 90.0, branchStrengthScore: 9.8, placementPercentage: 98.0, metadata: JSON.stringify({ lab_rating: 9.4 }) },
        { branchName: "Information Science & Engineering", branchCode: "ISE", tuitionFeeAnnual: 250000, hostelFeeAnnual: 85000, seatCapacity: 180, avgSalary: 1320000, medianSalary: 1200000, highestSalary: 4200000, minJeePercentileCutoff: 96.5, minClass12Cutoff: 88.0, branchStrengthScore: 9.5, placementPercentage: 96.0, metadata: JSON.stringify({ lab_rating: 9.2 }) },
      ]
    },
    {
      name: "DY Patil College of Engineering (Akurdi)",
      slug: "dypatil-pune",
      state: "Maharashtra",
      city: "Pune",
      logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
      coverImageUrl: "https://images.unsplash.com/photo-1527891751199-7225231a68dd?w=800&h=400&fit=crop",
      brochureUrl: "https://dypcoeakurdi.ac.in/brochure.pdf",
      officialApplyUrl: "https://dypcoeakurdi.ac.in/admissions",
      website: "https://dypcoeakurdi.ac.in",
      isPartner: true,
      commissionRate: 15000.00,
      placementScore: 7.7,
      collegeLifeScore: 8.4,
      curriculumScore: 7.9,
      metadata: JSON.stringify({ nirf_ranking: 150, infra_rating: 84, startup_ecosystem: 6.0, research_output: 5.5, international_exposure: 5.0 }),
      branches: [
        { branchName: "Computer Engineering", branchCode: "CSE", tuitionFeeAnnual: 135000, hostelFeeAnnual: 90000, seatCapacity: 180, avgSalary: 580000, medianSalary: 520000, highestSalary: 1800000, minJeePercentileCutoff: 87.0, minClass12Cutoff: 75.0, branchStrengthScore: 8.0, placementPercentage: 82.0, metadata: JSON.stringify({ lab_rating: 8.0 }) },
      ]
    }
  ];

  console.log("Seeding colleges and branches...");
  for (const c of collegesData) {
    const { branches, adminEmail, ...collegeInfo } = c;

    // Create the College record
    const createdCollege = await prisma.college.create({
      data: {
        ...collegeInfo,
      },
    });

    console.log(`Created College: ${createdCollege.name}`);

    // Create branches
    for (const b of branches) {
      await prisma.collegeBranch.create({
        data: {
          ...b,
          collegeId: createdCollege.id,
        },
      });
    }

    // Link Admin User
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

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
