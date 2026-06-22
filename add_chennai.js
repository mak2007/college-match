const fs = require('fs');

const content = fs.readFileSync('prisma/seed.ts', 'utf8');

const vitChennai = {
  name: "VIT Chennai",
  slug: "vit-chennai",
  state: "Tamil Nadu",
  city: "Chennai",
  logoUrl: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&h=100&fit=crop",
  coverImageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&h=400&fit=crop",
  brochureUrl: "https://chennai.vit.ac.in/files/brochure.pdf",
  officialApplyUrl: "https://viteee.vit.ac.in",
  website: "https://chennai.vit.ac.in",
  isPartner: false,
  isNewGen: false,
  commissionRate: 0.0,
  placementScore: 8.7,
  collegeLifeScore: 8.4,
  curriculumScore: 8.5,
  adminEmail: "admissions.chennai@vit.ac.in",
  metadata: JSON.stringify({
    infra_rating: 83,
    startup_ecosystem: 7.8,
    research_output: 7.5,
    exposure_score: 8.6,
  }),
  branches: [
    {
      branchName: "Computer Science & Engineering (Category 1)",
      branchCode: "CSE_CAT1",
      tuitionFeeAnnual: 195000,
      hostelFeeAnnual: 168000,
      seatCapacity: 120,
      avgSalary: 1000000,
      medianSalary: 700000,
      highestSalary: 7200000,
      minJeePercentileCutoff: 94.0,
      minClass12Cutoff: 60.0,
      branchStrengthScore: 8.7,
      placementPercentage: 90.0,
      metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 1", jeeOverlapRange: "90-93" }),
    },
    {
      branchName: "Computer Science & Engineering (Category 2)",
      branchCode: "CSE_CAT2",
      tuitionFeeAnnual: 290000,
      hostelFeeAnnual: 168000,
      seatCapacity: 120,
      avgSalary: 1000000,
      medianSalary: 700000,
      highestSalary: 7200000,
      minJeePercentileCutoff: 90.0,
      minClass12Cutoff: 60.0,
      branchStrengthScore: 8.7,
      placementPercentage: 90.0,
      metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 2", jeeOverlapRange: "89-92" }),
    },
    {
      branchName: "Computer Science & Engineering (Category 3)",
      branchCode: "CSE_CAT3",
      tuitionFeeAnnual: 375000,
      hostelFeeAnnual: 168000,
      seatCapacity: 120,
      avgSalary: 1000000,
      medianSalary: 700000,
      highestSalary: 7200000,
      minJeePercentileCutoff: 85.0,
      minClass12Cutoff: 60.0,
      branchStrengthScore: 8.7,
      placementPercentage: 90.0,
      metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 3", jeeOverlapRange: "85-88" }),
    },
    {
      branchName: "Computer Science & Engineering (Category 4)",
      branchCode: "CSE_CAT4",
      tuitionFeeAnnual: 400000,
      hostelFeeAnnual: 168000,
      seatCapacity: 120,
      avgSalary: 1000000,
      medianSalary: 700000,
      highestSalary: 7200000,
      minJeePercentileCutoff: 82.0,
      minClass12Cutoff: 60.0,
      branchStrengthScore: 8.7,
      placementPercentage: 90.0,
      metadata: JSON.stringify({ acceptsOwnExam: true, feeCategory: "Category 4", jeeOverlapRange: "78-84" }),
    }
  ]
};

const match = content.match(/const collegesData = (\[[\s\S]*?\]);\n\n  console\.log\(/);
if(match) {
  const colleges = JSON.parse(match[1]);
  colleges.push(vitChennai);
  
  const newContent = content.replace(match[1], JSON.stringify(colleges, null, 2));
  
  // also add admin user
  const adminAdd = `  await prisma.user.create({
    data: { email: "admissions.chennai@vit.ac.in", passwordHash: collegePasswordHash, role: "COLLEGE_ADMIN" },
  });`;
  
  const finalContent = newContent.replace('// 4. Define ALL Colleges Data', adminAdd + '\n\n  // 4. Define ALL Colleges Data');
  fs.writeFileSync('prisma/seed.ts', finalContent);
  console.log('Added VIT Chennai');
}
