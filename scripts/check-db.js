require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const colleges = await prisma.college.count();
  const branches = await prisma.collegeBranch.count();
  const scholarships = await prisma.scholarship.count();
  const recommendations = await prisma.recommendation.count();
  const students = await prisma.student.count();
  const pathways = await prisma.admissionPathway.count();

  console.log("=== DB Counts ===");
  console.log("Colleges:", colleges);
  console.log("Branches:", branches);
  console.log("Scholarships:", scholarships);
  console.log("AdmissionPathways:", pathways);
  console.log("Recommendations:", recommendations);
  console.log("Students:", students);

  const sample = await prisma.college.findMany({
    take: 5,
    include: { branches: true },
  });
  console.log("\n=== Sample Colleges ===");
  for (const c of sample) {
    console.log(`${c.name} (${c.slug}) - ${c.branches.length} branches, placement=${c.placementScore}, life=${c.collegeLifeScore}, curriculum=${c.curriculumScore}`);
    for (const b of c.branches.slice(0, 3)) {
      console.log(`  ${b.branchCode}: tuition=${b.tuitionFeeAnnual}, hostel=${b.hostelFeeAnnual}, avgSalary=${b.avgSalary}, cutoff=${b.minJeePercentileCutoff}, strength=${b.branchStrengthScore}`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
