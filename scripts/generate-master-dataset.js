const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "templates");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// SUPPORTED BRANCHES: CSE, IT, ECE, EE, ME
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 20 COLLEGES — Production Dataset
// ═══════════════════════════════════════════════════════════════════

const colleges = [
  { name: "Vellore Institute of Technology", state: "Tamil Nadu", city: "Vellore", officialApplyUrl: "https://vit.ac.in/apply", website: "https://vit.ac.in", placementScore: 9.2, collegeLifeScore: 8.8, curriculumScore: 9.0, isPartner: "true", commissionRate: 25000, nirf_ranking: 82, infra_rating: 88, startup_ecosystem: 72, research_output: 65, international_exposure: 58 },
  { name: "Manipal Institute of Technology", state: "Karnataka", city: "Manipal", officialApplyUrl: "https://manipal.edu/apply", website: "https://manipal.edu", placementScore: 8.9, collegeLifeScore: 9.6, curriculumScore: 8.7, isPartner: "true", commissionRate: 30000, nirf_ranking: 78, infra_rating: 95, startup_ecosystem: 85, research_output: 80, international_exposure: 92 },
  { name: "RV College of Engineering", state: "Karnataka", city: "Bangalore", officialApplyUrl: "https://rvce.edu.in/apply", website: "https://rvce.edu.in", placementScore: 9.0, collegeLifeScore: 8.5, curriculumScore: 8.8, isPartner: "false", commissionRate: 0, nirf_ranking: 72, infra_rating: 82, startup_ecosystem: 88, research_output: 70, international_exposure: 65 },
  { name: "DY Patil College of Engineering", state: "Maharashtra", city: "Pune", officialApplyUrl: "https://dypcoeakurdi.ac.in/apply", website: "https://dypcoeakurdi.ac.in", placementScore: 6.5, collegeLifeScore: 7.0, curriculumScore: 6.8, isPartner: "false", commissionRate: 0, nirf_ranking: 45, infra_rating: 70, startup_ecosystem: 45, research_output: 40, international_exposure: 35 },
  { name: "SRM Institute of Science and Technology", state: "Tamil Nadu", city: "Chennai", officialApplyUrl: "https://srmist.edu.in/apply", website: "https://srmist.edu.in", placementScore: 8.2, collegeLifeScore: 8.5, curriculumScore: 8.0, isPartner: "false", commissionRate: 0, nirf_ranking: 68, infra_rating: 85, startup_ecosystem: 70, research_output: 68, international_exposure: 72 },
  { name: "Amrita Vishwa Vidyapeetham", state: "Tamil Nadu", city: "Coimbatore", officialApplyUrl: "https://amrita.edu/apply", website: "https://amrita.edu", placementScore: 8.0, collegeLifeScore: 8.2, curriculumScore: 8.3, isPartner: "false", commissionRate: 0, nirf_ranking: 75, infra_rating: 84, startup_ecosystem: 62, research_output: 78, international_exposure: 68 },
  { name: "Thapar Institute of Engineering and Technology", state: "Punjab", city: "Patiala", officialApplyUrl: "https://thapar.edu/apply", website: "https://thapar.edu", placementScore: 8.3, collegeLifeScore: 8.0, curriculumScore: 8.1, isPartner: "false", commissionRate: 0, nirf_ranking: 65, infra_rating: 80, startup_ecosystem: 58, research_output: 65, international_exposure: 55 },
  { name: "BMS College of Engineering", state: "Karnataka", city: "Bangalore", officialApplyUrl: "https://bmsce.ac.in/apply", website: "https://bmsce.ac.in", placementScore: 8.1, collegeLifeScore: 7.8, curriculumScore: 8.0, isPartner: "false", commissionRate: 0, nirf_ranking: 70, infra_rating: 78, startup_ecosystem: 82, research_output: 60, international_exposure: 52 },
  { name: "Pune Institute of Computer Technology", state: "Maharashtra", city: "Pune", officialApplyUrl: "https://pict.edu/apply", website: "https://pict.edu", placementScore: 8.4, collegeLifeScore: 7.5, curriculumScore: 8.2, isPartner: "false", commissionRate: 0, nirf_ranking: 68, infra_rating: 75, startup_ecosystem: 68, research_output: 55, international_exposure: 48 },
  { name: "IIIT Hyderabad", state: "Telangana", city: "Hyderabad", officialApplyUrl: "https://iiit.ac.in/apply", website: "https://iiit.ac.in", placementScore: 9.5, collegeLifeScore: 8.0, curriculumScore: 9.3, isPartner: "false", commissionRate: 0, nirf_ranking: 90, infra_rating: 82, startup_ecosystem: 92, research_output: 95, international_exposure: 85 },
  { name: "Manipal University Jaipur", state: "Rajasthan", city: "Jaipur", officialApplyUrl: "https://jaipur.manipal.edu/apply", website: "https://jaipur.manipal.edu", placementScore: 6.8, collegeLifeScore: 8.5, curriculumScore: 7.0, isPartner: "false", commissionRate: 0, nirf_ranking: 50, infra_rating: 88, startup_ecosystem: 52, research_output: 45, international_exposure: 60 },
  { name: "KIIT University", state: "Odisha", city: "Bhubaneswar", officialApplyUrl: "https://kiit.ac.in/apply", website: "https://kiit.ac.in", placementScore: 7.2, collegeLifeScore: 8.0, curriculumScore: 7.0, isPartner: "false", commissionRate: 0, nirf_ranking: 55, infra_rating: 82, startup_ecosystem: 48, research_output: 50, international_exposure: 45 },
  { name: "Lovely Professional University", state: "Punjab", city: "Phagwara", officialApplyUrl: "https://lpu.in/apply", website: "https://lpu.in", placementScore: 6.0, collegeLifeScore: 7.5, curriculumScore: 6.2, isPartner: "false", commissionRate: 0, nirf_ranking: 38, infra_rating: 78, startup_ecosystem: 40, research_output: 35, international_exposure: 42 },
  { name: "SRM University AP", state: "Andhra Pradesh", city: "Amaravati", officialApplyUrl: "https://srmap.edu.in/apply", website: "https://srmap.edu.in", placementScore: 7.0, collegeLifeScore: 7.8, curriculumScore: 7.2, isPartner: "false", commissionRate: 0, nirf_ranking: 48, infra_rating: 80, startup_ecosystem: 50, research_output: 55, international_exposure: 55 },
  { name: "NIT Warangal", state: "Telangana", city: "Warangal", officialApplyUrl: "https://nitw.ac.in/apply", website: "https://nitw.ac.in", placementScore: 9.0, collegeLifeScore: 7.5, curriculumScore: 8.8, isPartner: "false", commissionRate: 0, nirf_ranking: 88, infra_rating: 78, startup_ecosystem: 55, research_output: 82, international_exposure: 62 },
  { name: "MAHE Manipal", state: "Karnataka", city: "Manipal", officialApplyUrl: "https://manipal.edu/apply", website: "https://manipal.edu", placementScore: 8.5, collegeLifeScore: 9.0, curriculumScore: 8.5, isPartner: "false", commissionRate: 0, nirf_ranking: 80, infra_rating: 90, startup_ecosystem: 70, research_output: 75, international_exposure: 78 },
  { name: "Chandigarh University", state: "Punjab", city: "Chandigarh", officialApplyUrl: "https://cuchd.in/apply", website: "https://cuchd.in", placementScore: 6.5, collegeLifeScore: 7.8, curriculumScore: 6.5, isPartner: "false", commissionRate: 0, nirf_ranking: 42, infra_rating: 75, startup_ecosystem: 42, research_output: 38, international_exposure: 45 },
  { name: "Galgotias University", state: "Uttar Pradesh", city: "Greater Noida", officialApplyUrl: "https://galgotiasuniversity.edu.in/apply", website: "https://galgotiasuniversity.edu.in", placementScore: 5.8, collegeLifeScore: 7.0, curriculumScore: 5.8, isPartner: "false", commissionRate: 0, nirf_ranking: 35, infra_rating: 68, startup_ecosystem: 35, research_output: 30, international_exposure: 32 },
  { name: "RV Institute of Technology and Management", state: "Karnataka", city: "Bangalore", officialApplyUrl: "https://rvitm.edu.in/apply", website: "https://rvitm.edu.in", placementScore: 7.5, collegeLifeScore: 7.8, curriculumScore: 7.5, isPartner: "false", commissionRate: 0, nirf_ranking: 58, infra_rating: 75, startup_ecosystem: 75, research_output: 55, international_exposure: 50 },
  { name: "Dayananda Sagar College of Engineering", state: "Karnataka", city: "Bangalore", officialApplyUrl: "https://dayanandasagar.edu/apply", website: "https://dayanandasagar.edu", placementScore: 7.0, collegeLifeScore: 7.5, curriculumScore: 7.0, isPartner: "false", commissionRate: 0, nirf_ranking: 52, infra_rating: 72, startup_ecosystem: 60, research_output: 48, international_exposure: 42 },
];

// ═══════════════════════════════════════════════════════════════════
// BRANCHES — Only CSE, IT, ECE, EE, ME
// ISE normalized to IT, CE removed, EE added where data exists
// ═══════════════════════════════════════════════════════════════════

const branchData = [
  // VIT
  { collegeName: "Vellore Institute of Technology", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 198000, hostelFeeAnnual: 95000, seatCapacity: 1200, avgSalary: 920000, medianSalary: 850000, highestSalary: 4400000, minJeePercentileCutoff: 94.5, minClass12Cutoff: 85.0, branchStrengthScore: 9.5, placementPercentage: 95.0 },
  { collegeName: "Vellore Institute of Technology", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 198000, hostelFeeAnnual: 95000, seatCapacity: 300, avgSalary: 860000, medianSalary: 800000, highestSalary: 3200000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 82.0, branchStrengthScore: 9.2, placementPercentage: 92.0 },
  { collegeName: "Vellore Institute of Technology", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 195000, hostelFeeAnnual: 95000, seatCapacity: 600, avgSalary: 750000, medianSalary: 700000, highestSalary: 2200000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 80.0, branchStrengthScore: 8.8, placementPercentage: 88.0 },
  { collegeName: "Vellore Institute of Technology", branchCode: "EE", branchName: "Electrical Engineering", tuitionFeeAnnual: 185000, hostelFeeAnnual: 95000, seatCapacity: 200, avgSalary: 600000, medianSalary: 550000, highestSalary: 1500000, minJeePercentileCutoff: 85.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.8, placementPercentage: 82.0 },
  { collegeName: "Vellore Institute of Technology", branchCode: "ME", branchName: "Mechanical Engineering", tuitionFeeAnnual: 175000, hostelFeeAnnual: 95000, seatCapacity: 400, avgSalary: 520000, medianSalary: 480000, highestSalary: 1200000, minJeePercentileCutoff: 82.0, minClass12Cutoff: 72.0, branchStrengthScore: 7.5, placementPercentage: 78.0 },

  // MIT Manipal
  { collegeName: "Manipal Institute of Technology", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 335000, hostelFeeAnnual: 110000, seatCapacity: 400, avgSalary: 1250000, medianSalary: 1100000, highestSalary: 5400000, minJeePercentileCutoff: 96.0, minClass12Cutoff: 88.0, branchStrengthScore: 9.4, placementPercentage: 97.0 },
  { collegeName: "Manipal Institute of Technology", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 320000, hostelFeeAnnual: 110000, seatCapacity: 180, avgSalary: 1100000, medianSalary: 980000, highestSalary: 4200000, minJeePercentileCutoff: 94.0, minClass12Cutoff: 85.0, branchStrengthScore: 9.0, placementPercentage: 95.0 },
  { collegeName: "Manipal Institute of Technology", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 290000, hostelFeeAnnual: 110000, seatCapacity: 240, avgSalary: 900000, medianSalary: 820000, highestSalary: 2800000, minJeePercentileCutoff: 91.5, minClass12Cutoff: 80.0, branchStrengthScore: 8.9, placementPercentage: 90.0 },
  { collegeName: "Manipal Institute of Technology", branchCode: "EE", branchName: "Electrical Engineering", tuitionFeeAnnual: 270000, hostelFeeAnnual: 110000, seatCapacity: 120, avgSalary: 750000, medianSalary: 680000, highestSalary: 2200000, minJeePercentileCutoff: 88.0, minClass12Cutoff: 76.0, branchStrengthScore: 8.2, placementPercentage: 86.0 },

  // RVCE — ISE → IT
  { collegeName: "RV College of Engineering", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 120000, hostelFeeAnnual: 85000, seatCapacity: 180, avgSalary: 1100000, medianSalary: 1000000, highestSalary: 4800000, minJeePercentileCutoff: 97.0, minClass12Cutoff: 90.0, branchStrengthScore: 9.3, placementPercentage: 96.0 },
  { collegeName: "RV College of Engineering", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 120000, hostelFeeAnnual: 85000, seatCapacity: 120, avgSalary: 1000000, medianSalary: 920000, highestSalary: 3800000, minJeePercentileCutoff: 95.0, minClass12Cutoff: 87.0, branchStrengthScore: 9.0, placementPercentage: 94.0 },
  { collegeName: "RV College of Engineering", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 118000, hostelFeeAnnual: 85000, seatCapacity: 120, avgSalary: 850000, medianSalary: 780000, highestSalary: 3000000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 84.0, branchStrengthScore: 8.5, placementPercentage: 92.0 },

  // DY Patil
  { collegeName: "DY Patil College of Engineering", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 165000, hostelFeeAnnual: 75000, seatCapacity: 300, avgSalary: 550000, medianSalary: 500000, highestSalary: 1800000, minJeePercentileCutoff: 85.0, minClass12Cutoff: 70.0, branchStrengthScore: 7.0, placementPercentage: 78.0 },
  { collegeName: "DY Patil College of Engineering", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 165000, hostelFeeAnnual: 75000, seatCapacity: 180, avgSalary: 500000, medianSalary: 460000, highestSalary: 1500000, minJeePercentileCutoff: 82.0, minClass12Cutoff: 68.0, branchStrengthScore: 6.8, placementPercentage: 75.0 },
  { collegeName: "DY Patil College of Engineering", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 155000, hostelFeeAnnual: 75000, seatCapacity: 180, avgSalary: 450000, medianSalary: 420000, highestSalary: 1200000, minJeePercentileCutoff: 78.0, minClass12Cutoff: 65.0, branchStrengthScore: 6.5, placementPercentage: 72.0 },

  // SRM
  { collegeName: "SRM Institute of Science and Technology", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 250000, hostelFeeAnnual: 100000, seatCapacity: 800, avgSalary: 800000, medianSalary: 720000, highestSalary: 4100000, minJeePercentileCutoff: 92.0, minClass12Cutoff: 82.0, branchStrengthScore: 8.8, placementPercentage: 90.0 },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 250000, hostelFeeAnnual: 100000, seatCapacity: 300, avgSalary: 750000, medianSalary: 680000, highestSalary: 3200000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 80.0, branchStrengthScore: 8.5, placementPercentage: 88.0 },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 230000, hostelFeeAnnual: 100000, seatCapacity: 400, avgSalary: 620000, medianSalary: 580000, highestSalary: 2000000, minJeePercentileCutoff: 86.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.8, placementPercentage: 82.0 },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "EE", branchName: "Electrical Engineering", tuitionFeeAnnual: 210000, hostelFeeAnnual: 100000, seatCapacity: 200, avgSalary: 520000, medianSalary: 480000, highestSalary: 1400000, minJeePercentileCutoff: 80.0, minClass12Cutoff: 70.0, branchStrengthScore: 7.2, placementPercentage: 78.0 },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "ME", branchName: "Mechanical Engineering", tuitionFeeAnnual: 200000, hostelFeeAnnual: 100000, seatCapacity: 300, avgSalary: 480000, medianSalary: 440000, highestSalary: 1100000, minJeePercentileCutoff: 78.0, minClass12Cutoff: 68.0, branchStrengthScore: 7.0, placementPercentage: 75.0 },

  // Amrita
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 200000, hostelFeeAnnual: 85000, seatCapacity: 350, avgSalary: 780000, medianSalary: 720000, highestSalary: 3500000, minJeePercentileCutoff: 91.0, minClass12Cutoff: 82.0, branchStrengthScore: 8.5, placementPercentage: 88.0 },
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 200000, hostelFeeAnnual: 85000, seatCapacity: 180, avgSalary: 720000, medianSalary: 660000, highestSalary: 2800000, minJeePercentileCutoff: 89.0, minClass12Cutoff: 78.0, branchStrengthScore: 8.2, placementPercentage: 86.0 },
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 185000, hostelFeeAnnual: 85000, seatCapacity: 200, avgSalary: 600000, medianSalary: 550000, highestSalary: 1800000, minJeePercentileCutoff: 85.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.8, placementPercentage: 82.0 },

  // Thapar
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 190000, hostelFeeAnnual: 80000, seatCapacity: 300, avgSalary: 850000, medianSalary: 780000, highestSalary: 3200000, minJeePercentileCutoff: 92.0, minClass12Cutoff: 82.0, branchStrengthScore: 8.5, placementPercentage: 90.0 },
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 190000, hostelFeeAnnual: 80000, seatCapacity: 180, avgSalary: 800000, medianSalary: 740000, highestSalary: 2800000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 80.0, branchStrengthScore: 8.3, placementPercentage: 88.0 },
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 180000, hostelFeeAnnual: 80000, seatCapacity: 180, avgSalary: 620000, medianSalary: 580000, highestSalary: 1800000, minJeePercentileCutoff: 86.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.8, placementPercentage: 82.0 },

  // BMSCE — ISE → IT
  { collegeName: "BMS College of Engineering", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 110000, hostelFeeAnnual: 70000, seatCapacity: 180, avgSalary: 800000, medianSalary: 750000, highestSalary: 3000000, minJeePercentileCutoff: 94.0, minClass12Cutoff: 85.0, branchStrengthScore: 8.5, placementPercentage: 90.0 },
  { collegeName: "BMS College of Engineering", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 110000, hostelFeeAnnual: 70000, seatCapacity: 120, avgSalary: 750000, medianSalary: 700000, highestSalary: 2500000, minJeePercentileCutoff: 92.0, minClass12Cutoff: 82.0, branchStrengthScore: 8.2, placementPercentage: 88.0 },
  { collegeName: "BMS College of Engineering", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 105000, hostelFeeAnnual: 70000, seatCapacity: 100, avgSalary: 600000, medianSalary: 550000, highestSalary: 2000000, minJeePercentileCutoff: 88.0, minClass12Cutoff: 78.0, branchStrengthScore: 7.5, placementPercentage: 84.0 },

  // PICT
  { collegeName: "Pune Institute of Computer Technology", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 105000, hostelFeeAnnual: 65000, seatCapacity: 240, avgSalary: 900000, medianSalary: 820000, highestSalary: 3500000, minJeePercentileCutoff: 95.0, minClass12Cutoff: 86.0, branchStrengthScore: 8.8, placementPercentage: 92.0 },
  { collegeName: "Pune Institute of Computer Technology", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 105000, hostelFeeAnnual: 65000, seatCapacity: 180, avgSalary: 850000, medianSalary: 780000, highestSalary: 3000000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 83.0, branchStrengthScore: 8.5, placementPercentage: 90.0 },
  { collegeName: "Pune Institute of Computer Technology", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 100000, hostelFeeAnnual: 65000, seatCapacity: 120, avgSalary: 650000, medianSalary: 600000, highestSalary: 2200000, minJeePercentileCutoff: 88.0, minClass12Cutoff: 78.0, branchStrengthScore: 7.8, placementPercentage: 85.0 },

  // IIIT Hyderabad
  { collegeName: "IIIT Hyderabad", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 160000, hostelFeeAnnual: 75000, seatCapacity: 120, avgSalary: 1600000, medianSalary: 1400000, highestSalary: 7200000, minJeePercentileCutoff: 98.5, minClass12Cutoff: 92.0, branchStrengthScore: 9.8, placementPercentage: 98.0 },
  { collegeName: "IIIT Hyderabad", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 160000, hostelFeeAnnual: 75000, seatCapacity: 60, avgSalary: 1200000, medianSalary: 1100000, highestSalary: 4500000, minJeePercentileCutoff: 96.0, minClass12Cutoff: 88.0, branchStrengthScore: 9.2, placementPercentage: 96.0 },

  // MUJ
  { collegeName: "Manipal University Jaipur", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 195000, hostelFeeAnnual: 85000, seatCapacity: 300, avgSalary: 600000, medianSalary: 550000, highestSalary: 2200000, minJeePercentileCutoff: 85.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.2, placementPercentage: 80.0 },
  { collegeName: "Manipal University Jaipur", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 195000, hostelFeeAnnual: 85000, seatCapacity: 180, avgSalary: 550000, medianSalary: 500000, highestSalary: 2000000, minJeePercentileCutoff: 83.0, minClass12Cutoff: 72.0, branchStrengthScore: 7.0, placementPercentage: 78.0 },
  { collegeName: "Manipal University Jaipur", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 180000, hostelFeeAnnual: 85000, seatCapacity: 180, avgSalary: 480000, medianSalary: 440000, highestSalary: 1500000, minJeePercentileCutoff: 78.0, minClass12Cutoff: 68.0, branchStrengthScore: 6.5, placementPercentage: 72.0 },

  // KIIT
  { collegeName: "KIIT University", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 160000, hostelFeeAnnual: 65000, seatCapacity: 500, avgSalary: 600000, medianSalary: 550000, highestSalary: 2500000, minJeePercentileCutoff: 82.0, minClass12Cutoff: 72.0, branchStrengthScore: 7.5, placementPercentage: 80.0 },
  { collegeName: "KIIT University", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 160000, hostelFeeAnnual: 65000, seatCapacity: 300, avgSalary: 550000, medianSalary: 500000, highestSalary: 2200000, minJeePercentileCutoff: 80.0, minClass12Cutoff: 70.0, branchStrengthScore: 7.2, placementPercentage: 78.0 },
  { collegeName: "KIIT University", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 150000, hostelFeeAnnual: 65000, seatCapacity: 300, avgSalary: 450000, medianSalary: 420000, highestSalary: 1400000, minJeePercentileCutoff: 75.0, minClass12Cutoff: 65.0, branchStrengthScore: 6.8, placementPercentage: 72.0 },

  // LPU
  { collegeName: "Lovely Professional University", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 120000, hostelFeeAnnual: 55000, seatCapacity: 800, avgSalary: 450000, medianSalary: 400000, highestSalary: 1800000, minJeePercentileCutoff: 70.0, minClass12Cutoff: 60.0, branchStrengthScore: 6.2, placementPercentage: 70.0 },
  { collegeName: "Lovely Professional University", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 120000, hostelFeeAnnual: 55000, seatCapacity: 400, avgSalary: 420000, medianSalary: 380000, highestSalary: 1600000, minJeePercentileCutoff: 68.0, minClass12Cutoff: 58.0, branchStrengthScore: 6.0, placementPercentage: 68.0 },
  { collegeName: "Lovely Professional University", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 110000, hostelFeeAnnual: 55000, seatCapacity: 400, avgSalary: 350000, medianSalary: 320000, highestSalary: 1000000, minJeePercentileCutoff: 62.0, minClass12Cutoff: 55.0, branchStrengthScore: 5.5, placementPercentage: 62.0 },
  { collegeName: "Lovely Professional University", branchCode: "ME", branchName: "Mechanical Engineering", tuitionFeeAnnual: 100000, hostelFeeAnnual: 55000, seatCapacity: 300, avgSalary: 320000, medianSalary: 280000, highestSalary: 800000, minJeePercentileCutoff: 58.0, minClass12Cutoff: 50.0, branchStrengthScore: 5.0, placementPercentage: 58.0 },

  // SRM AP
  { collegeName: "SRM University AP", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 180000, hostelFeeAnnual: 75000, seatCapacity: 250, avgSalary: 650000, medianSalary: 600000, highestSalary: 2800000, minJeePercentileCutoff: 85.0, minClass12Cutoff: 75.0, branchStrengthScore: 7.5, placementPercentage: 82.0 },
  { collegeName: "SRM University AP", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 180000, hostelFeeAnnual: 75000, seatCapacity: 150, avgSalary: 600000, medianSalary: 550000, highestSalary: 2400000, minJeePercentileCutoff: 83.0, minClass12Cutoff: 72.0, branchStrengthScore: 7.2, placementPercentage: 80.0 },
  { collegeName: "SRM University AP", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 170000, hostelFeeAnnual: 75000, seatCapacity: 150, avgSalary: 500000, medianSalary: 460000, highestSalary: 1600000, minJeePercentileCutoff: 78.0, minClass12Cutoff: 68.0, branchStrengthScore: 6.8, placementPercentage: 75.0 },

  // NIT Warangal
  { collegeName: "NIT Warangal", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 65000, hostelFeeAnnual: 35000, seatCapacity: 120, avgSalary: 1400000, medianSalary: 1200000, highestSalary: 6200000, minJeePercentileCutoff: 98.0, minClass12Cutoff: 90.0, branchStrengthScore: 9.5, placementPercentage: 98.0 },
  { collegeName: "NIT Warangal", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 65000, hostelFeeAnnual: 35000, seatCapacity: 90, avgSalary: 1000000, medianSalary: 900000, highestSalary: 3500000, minJeePercentileCutoff: 95.0, minClass12Cutoff: 85.0, branchStrengthScore: 8.8, placementPercentage: 94.0 },
  { collegeName: "NIT Warangal", branchCode: "EE", branchName: "Electrical Engineering", tuitionFeeAnnual: 65000, hostelFeeAnnual: 35000, seatCapacity: 70, avgSalary: 800000, medianSalary: 720000, highestSalary: 2800000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 82.0, branchStrengthScore: 8.5, placementPercentage: 92.0 },

  // MAHE Manipal
  { collegeName: "MAHE Manipal", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 320000, hostelFeeAnnual: 110000, seatCapacity: 200, avgSalary: 1200000, medianSalary: 1050000, highestSalary: 5000000, minJeePercentileCutoff: 95.5, minClass12Cutoff: 87.0, branchStrengthScore: 9.2, placementPercentage: 96.0 },
  { collegeName: "MAHE Manipal", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 320000, hostelFeeAnnual: 110000, seatCapacity: 120, avgSalary: 1050000, medianSalary: 950000, highestSalary: 4000000, minJeePercentileCutoff: 93.0, minClass12Cutoff: 84.0, branchStrengthScore: 8.8, placementPercentage: 94.0 },
  { collegeName: "MAHE Manipal", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 280000, hostelFeeAnnual: 110000, seatCapacity: 150, avgSalary: 850000, medianSalary: 780000, highestSalary: 2500000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 78.0, branchStrengthScore: 8.5, placementPercentage: 88.0 },

  // Chandigarh University
  { collegeName: "Chandigarh University", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 130000, hostelFeeAnnual: 55000, seatCapacity: 600, avgSalary: 500000, medianSalary: 450000, highestSalary: 2000000, minJeePercentileCutoff: 72.0, minClass12Cutoff: 62.0, branchStrengthScore: 6.5, placementPercentage: 72.0 },
  { collegeName: "Chandigarh University", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 130000, hostelFeeAnnual: 55000, seatCapacity: 300, avgSalary: 450000, medianSalary: 400000, highestSalary: 1800000, minJeePercentileCutoff: 70.0, minClass12Cutoff: 60.0, branchStrengthScore: 6.2, placementPercentage: 70.0 },
  { collegeName: "Chandigarh University", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 120000, hostelFeeAnnual: 55000, seatCapacity: 300, avgSalary: 380000, medianSalary: 350000, highestSalary: 1100000, minJeePercentileCutoff: 65.0, minClass12Cutoff: 55.0, branchStrengthScore: 5.8, placementPercentage: 65.0 },

  // Galgotias
  { collegeName: "Galgotias University", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 115000, hostelFeeAnnual: 50000, seatCapacity: 500, avgSalary: 400000, medianSalary: 360000, highestSalary: 1500000, minJeePercentileCutoff: 65.0, minClass12Cutoff: 55.0, branchStrengthScore: 5.8, placementPercentage: 65.0 },
  { collegeName: "Galgotias University", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 115000, hostelFeeAnnual: 50000, seatCapacity: 300, avgSalary: 370000, medianSalary: 330000, highestSalary: 1300000, minJeePercentileCutoff: 63.0, minClass12Cutoff: 53.0, branchStrengthScore: 5.5, placementPercentage: 62.0 },
  { collegeName: "Galgotias University", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 105000, hostelFeeAnnual: 50000, seatCapacity: 250, avgSalary: 320000, medianSalary: 280000, highestSalary: 900000, minJeePercentileCutoff: 58.0, minClass12Cutoff: 50.0, branchStrengthScore: 5.0, placementPercentage: 55.0 },

  // RVITM — ISE → IT
  { collegeName: "RV Institute of Technology and Management", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 115000, hostelFeeAnnual: 70000, seatCapacity: 120, avgSalary: 750000, medianSalary: 680000, highestSalary: 2800000, minJeePercentileCutoff: 90.0, minClass12Cutoff: 80.0, branchStrengthScore: 8.0, placementPercentage: 86.0 },
  { collegeName: "RV Institute of Technology and Management", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 115000, hostelFeeAnnual: 70000, seatCapacity: 80, avgSalary: 700000, medianSalary: 640000, highestSalary: 2400000, minJeePercentileCutoff: 88.0, minClass12Cutoff: 78.0, branchStrengthScore: 7.8, placementPercentage: 84.0 },
  { collegeName: "RV Institute of Technology and Management", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 110000, hostelFeeAnnual: 70000, seatCapacity: 60, avgSalary: 550000, medianSalary: 500000, highestSalary: 1800000, minJeePercentileCutoff: 84.0, minClass12Cutoff: 74.0, branchStrengthScore: 7.0, placementPercentage: 78.0 },

  // Dayananda Sagar
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "CSE", branchName: "Computer Science & Engineering", tuitionFeeAnnual: 110000, hostelFeeAnnual: 60000, seatCapacity: 200, avgSalary: 600000, medianSalary: 550000, highestSalary: 2200000, minJeePercentileCutoff: 82.0, minClass12Cutoff: 72.0, branchStrengthScore: 7.2, placementPercentage: 80.0 },
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "IT", branchName: "Information Technology", tuitionFeeAnnual: 110000, hostelFeeAnnual: 60000, seatCapacity: 120, avgSalary: 550000, medianSalary: 500000, highestSalary: 1900000, minJeePercentileCutoff: 80.0, minClass12Cutoff: 70.0, branchStrengthScore: 7.0, placementPercentage: 78.0 },
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "ECE", branchName: "Electronics & Communication Engineering", tuitionFeeAnnual: 100000, hostelFeeAnnual: 60000, seatCapacity: 120, avgSalary: 450000, medianSalary: 420000, highestSalary: 1300000, minJeePercentileCutoff: 75.0, minClass12Cutoff: 65.0, branchStrengthScore: 6.5, placementPercentage: 72.0 },
];

// ═══════════════════════════════════════════════════════════════════
// SCHOLARSHIPS — 1-2 per college
// ═══════════════════════════════════════════════════════════════════

const scholarships = [
  { collegeName: "Vellore Institute of Technology", name: "VIT Merit Scholarship", amountType: "PERCENTAGE", amount: 25, description: "Top 1% VITEEE rankers", isActive: "true", criteria: "VITEEE rank <= 1000" },
  { collegeName: "Vellore Institute of Technology", name: "VIT Need-Based Fee Waiver", amountType: "TUITION_WAIVER", amount: 50, description: "Family income < 5 LPA", isActive: "true", criteria: "Family income < 500000" },
  { collegeName: "Manipal Institute of Technology", name: "Manipal Excellence Award", amountType: "FIXED", amount: 75000, description: "Top 500 MU-OET rankers", isActive: "true", criteria: "MU-OET rank <= 500" },
  { collegeName: "Manipal Institute of Technology", name: "Manipal Diversity Scholarship", amountType: "PERCENTAGE", amount: 15, description: "For northeast/state board toppers", isActive: "true", criteria: "Board topper OR northeast domicile" },
  { collegeName: "RV College of Engineering", name: "RVCE Merit Waiver", amountType: "TUITION_WAIVER", amount: 30, description: "COMEDK top 100 rankers", isActive: "true", criteria: "COMEDK rank <= 100" },
  { collegeName: "DY Patil College of Engineering", name: "DY Patil Merit Award", amountType: "FIXED", amount: 25000, description: "MHT-CET 95+ percentile", isActive: "true", criteria: "MHT-CET percentile >= 95" },
  { collegeName: "SRM Institute of Science and Technology", name: "SRM Merit Scholarship", amountType: "PERCENTAGE", amount: 20, description: "SRMJEEE top 500", isActive: "true", criteria: "SRMJEEE rank <= 500" },
  { collegeName: "Amrita Vishwa Vidyapeetham", name: "Amrita Vishwa Scholarship", amountType: "PERCENTAGE", amount: 25, description: "AEEE top 200 rankers", isActive: "true", criteria: "AEEE rank <= 200" },
  { collegeName: "Thapar Institute of Engineering and Technology", name: "Thapar Merit Award", amountType: "FIXED", amount: 50000, description: "JEE 95+ percentile", isActive: "true", criteria: "JEE percentile >= 95" },
  { collegeName: "BMS College of Engineering", name: "BMSCE Merit Waiver", amountType: "TUITION_WAIVER", amount: 25, description: "COMEDK top 200", isActive: "true", criteria: "COMEDK rank <= 200" },
  { collegeName: "Pune Institute of Computer Technology", name: "PICT Merit Scholarship", amountType: "FIXED", amount: 30000, description: "MHT-CET 96+ percentile CSE", isActive: "true", criteria: "MHT-CET percentile >= 96 AND branch = CSE" },
  { collegeName: "IIIT Hyderabad", name: "IIITH Need-Based Aid", amountType: "PERCENTAGE", amount: 50, description: "Family income < 6 LPA", isActive: "true", criteria: "Family income < 600000" },
  { collegeName: "Manipal University Jaipur", name: "MUJ Merit Award", amountType: "FIXED", amount: 35000, description: "MU-OET top 1000", isActive: "true", criteria: "MU-OET rank <= 1000" },
  { collegeName: "KIIT University", name: "KIITEE Merit Scholarship", amountType: "PERCENTAGE", amount: 20, description: "KIITEE top 500", isActive: "true", criteria: "KIITEE rank <= 500" },
  { collegeName: "Lovely Professional University", name: "LPU NEST Scholarship", amountType: "PERCENTAGE", amount: 30, description: "LPUNEST top 100", isActive: "true", criteria: "LPUNEST rank <= 100" },
  { collegeName: "SRM University AP", name: "SRM AP Merit Award", amountType: "FIXED", amount: 40000, description: "SRMJEEE top 1000", isActive: "true", criteria: "SRMJEEE rank <= 1000" },
  { collegeName: "NIT Warangal", name: "NITW Merit-cum-Means", amountType: "PERCENTAGE", amount: 100, description: "Full tuition for JEE top 500, family income < 5 LPA", isActive: "true", criteria: "JEE rank <= 500 AND family income < 500000" },
  { collegeName: "MAHE Manipal", name: "MAHE Excellence Scholarship", amountType: "FIXED", amount: 60000, description: "MET top 300", isActive: "true", criteria: "MET rank <= 300" },
  { collegeName: "Chandigarh University", name: "CU Merit Scholarship", amountType: "PERCENTAGE", amount: 25, description: "CUCET Phase 1 top 100", isActive: "true", criteria: "CUCET rank <= 100" },
  { collegeName: "Galgotias University", name: "Galgotias Merit Award", amountType: "FIXED", amount: 20000, description: "JEE 80+ percentile", isActive: "true", criteria: "JEE percentile >= 80" },
  { collegeName: "RV Institute of Technology and Management", name: "RVITM Merit Waiver", amountType: "TUITION_WAIVER", amount: 20, description: "COMEDK top 500", isActive: "true", criteria: "COMEDK rank <= 500" },
  { collegeName: "Dayananda Sagar College of Engineering", name: "DSCE Merit Award", amountType: "FIXED", amount: 20000, description: "COMEDK 90+ percentile", isActive: "true", criteria: "COMEDK percentile >= 90" },
];

// ═══════════════════════════════════════════════════════════════════
// ADMISSION PATHWAYS — Only CSE, IT, ECE, EE, ME
// ISE → IT normalization applied
// ═══════════════════════════════════════════════════════════════════

const pathways = [
  // VIT
  { collegeName: "Vellore Institute of Technology", branchCode: "CSE", admissionExam: "VITEEE", equivalentJeePercentile: 92.0, admissionMode: "Entrance Exam" },
  { collegeName: "Vellore Institute of Technology", branchCode: "IT", admissionExam: "VITEEE", equivalentJeePercentile: 90.0, admissionMode: "Entrance Exam" },
  { collegeName: "Vellore Institute of Technology", branchCode: "ECE", admissionExam: "VITEEE", equivalentJeePercentile: 88.0, admissionMode: "Entrance Exam" },
  { collegeName: "Vellore Institute of Technology", branchCode: "EE", admissionExam: "VITEEE", equivalentJeePercentile: 84.0, admissionMode: "Entrance Exam" },
  { collegeName: "Vellore Institute of Technology", branchCode: "ME", admissionExam: "VITEEE", equivalentJeePercentile: 80.0, admissionMode: "Entrance Exam" },
  // MIT
  { collegeName: "Manipal Institute of Technology", branchCode: "CSE", admissionExam: "MU-OET", equivalentJeePercentile: 94.0, admissionMode: "Entrance Exam" },
  { collegeName: "Manipal Institute of Technology", branchCode: "IT", admissionExam: "MU-OET", equivalentJeePercentile: 92.0, admissionMode: "Entrance Exam" },
  { collegeName: "Manipal Institute of Technology", branchCode: "ECE", admissionExam: "MU-OET", equivalentJeePercentile: 89.0, admissionMode: "Entrance Exam" },
  { collegeName: "Manipal Institute of Technology", branchCode: "EE", admissionExam: "MU-OET", equivalentJeePercentile: 86.0, admissionMode: "Entrance Exam" },
  // RVCE
  { collegeName: "RV College of Engineering", branchCode: "CSE", admissionExam: "COMEDK", equivalentJeePercentile: 96.0, admissionMode: "Counseling" },
  { collegeName: "RV College of Engineering", branchCode: "CSE", admissionExam: "KCET", equivalentJeePercentile: 95.0, admissionMode: "State Quota" },
  { collegeName: "RV College of Engineering", branchCode: "IT", admissionExam: "COMEDK", equivalentJeePercentile: 94.0, admissionMode: "Counseling" },
  { collegeName: "RV College of Engineering", branchCode: "ECE", admissionExam: "COMEDK", equivalentJeePercentile: 92.0, admissionMode: "Counseling" },
  // DY Patil
  { collegeName: "DY Patil College of Engineering", branchCode: "CSE", admissionExam: "MHT-CET", equivalentJeePercentile: 84.0, admissionMode: "Counseling" },
  { collegeName: "DY Patil College of Engineering", branchCode: "IT", admissionExam: "MHT-CET", equivalentJeePercentile: 82.0, admissionMode: "Counseling" },
  { collegeName: "DY Patil College of Engineering", branchCode: "ECE", admissionExam: "MHT-CET", equivalentJeePercentile: 76.0, admissionMode: "Counseling" },
  // SRM
  { collegeName: "SRM Institute of Science and Technology", branchCode: "CSE", admissionExam: "SRMJEEE", equivalentJeePercentile: 90.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "IT", admissionExam: "SRMJEEE", equivalentJeePercentile: 88.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "ECE", admissionExam: "SRMJEEE", equivalentJeePercentile: 84.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "EE", admissionExam: "SRMJEEE", equivalentJeePercentile: 79.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM Institute of Science and Technology", branchCode: "ME", admissionExam: "SRMJEEE", equivalentJeePercentile: 76.0, admissionMode: "Entrance Exam" },
  // Amrita
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "CSE", admissionExam: "AEEE", equivalentJeePercentile: 89.0, admissionMode: "Entrance Exam" },
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "IT", admissionExam: "AEEE", equivalentJeePercentile: 87.0, admissionMode: "Entrance Exam" },
  { collegeName: "Amrita Vishwa Vidyapeetham", branchCode: "ECE", admissionExam: "AEEE", equivalentJeePercentile: 83.0, admissionMode: "Entrance Exam" },
  // Thapar
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "CSE", admissionExam: "JEE Main", equivalentJeePercentile: 92.0, admissionMode: "Counseling" },
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "IT", admissionExam: "JEE Main", equivalentJeePercentile: 90.0, admissionMode: "Counseling" },
  { collegeName: "Thapar Institute of Engineering and Technology", branchCode: "ECE", admissionExam: "JEE Main", equivalentJeePercentile: 85.0, admissionMode: "Counseling" },
  // BMSCE
  { collegeName: "BMS College of Engineering", branchCode: "CSE", admissionExam: "COMEDK", equivalentJeePercentile: 93.0, admissionMode: "Counseling" },
  { collegeName: "BMS College of Engineering", branchCode: "IT", admissionExam: "COMEDK", equivalentJeePercentile: 91.0, admissionMode: "Counseling" },
  { collegeName: "BMS College of Engineering", branchCode: "ECE", admissionExam: "COMEDK", equivalentJeePercentile: 87.0, admissionMode: "Counseling" },
  // PICT
  { collegeName: "Pune Institute of Computer Technology", branchCode: "CSE", admissionExam: "MHT-CET", equivalentJeePercentile: 94.0, admissionMode: "Counseling" },
  { collegeName: "Pune Institute of Computer Technology", branchCode: "IT", admissionExam: "MHT-CET", equivalentJeePercentile: 92.0, admissionMode: "Counseling" },
  { collegeName: "Pune Institute of Computer Technology", branchCode: "ECE", admissionExam: "MHT-CET", equivalentJeePercentile: 87.0, admissionMode: "Counseling" },
  // IIIT Hyderabad
  { collegeName: "IIIT Hyderabad", branchCode: "CSE", admissionExam: "JEE Main", equivalentJeePercentile: 98.5, admissionMode: "Counseling" },
  { collegeName: "IIIT Hyderabad", branchCode: "ECE", admissionExam: "JEE Main", equivalentJeePercentile: 96.0, admissionMode: "Counseling" },
  // MUJ
  { collegeName: "Manipal University Jaipur", branchCode: "CSE", admissionExam: "MET", equivalentJeePercentile: 84.0, admissionMode: "Entrance Exam" },
  { collegeName: "Manipal University Jaipur", branchCode: "IT", admissionExam: "MET", equivalentJeePercentile: 82.0, admissionMode: "Entrance Exam" },
  { collegeName: "Manipal University Jaipur", branchCode: "ECE", admissionExam: "MET", equivalentJeePercentile: 76.0, admissionMode: "Entrance Exam" },
  // KIIT
  { collegeName: "KIIT University", branchCode: "CSE", admissionExam: "KIITEE", equivalentJeePercentile: 80.0, admissionMode: "Entrance Exam" },
  { collegeName: "KIIT University", branchCode: "IT", admissionExam: "KIITEE", equivalentJeePercentile: 78.0, admissionMode: "Entrance Exam" },
  { collegeName: "KIIT University", branchCode: "ECE", admissionExam: "KIITEE", equivalentJeePercentile: 73.0, admissionMode: "Entrance Exam" },
  // LPU
  { collegeName: "Lovely Professional University", branchCode: "CSE", admissionExam: "LPUNEST", equivalentJeePercentile: 68.0, admissionMode: "Entrance Exam" },
  { collegeName: "Lovely Professional University", branchCode: "IT", admissionExam: "LPUNEST", equivalentJeePercentile: 66.0, admissionMode: "Entrance Exam" },
  { collegeName: "Lovely Professional University", branchCode: "ECE", admissionExam: "LPUNEST", equivalentJeePercentile: 60.0, admissionMode: "Entrance Exam" },
  { collegeName: "Lovely Professional University", branchCode: "ME", admissionExam: "LPUNEST", equivalentJeePercentile: 55.0, admissionMode: "Entrance Exam" },
  // SRM AP
  { collegeName: "SRM University AP", branchCode: "CSE", admissionExam: "SRMJEEE", equivalentJeePercentile: 83.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM University AP", branchCode: "IT", admissionExam: "SRMJEEE", equivalentJeePercentile: 81.0, admissionMode: "Entrance Exam" },
  { collegeName: "SRM University AP", branchCode: "ECE", admissionExam: "SRMJEEE", equivalentJeePercentile: 76.0, admissionMode: "Entrance Exam" },
  // NIT Warangal
  { collegeName: "NIT Warangal", branchCode: "CSE", admissionExam: "JEE Main", equivalentJeePercentile: 98.0, admissionMode: "Counseling" },
  { collegeName: "NIT Warangal", branchCode: "ECE", admissionExam: "JEE Main", equivalentJeePercentile: 95.0, admissionMode: "Counseling" },
  { collegeName: "NIT Warangal", branchCode: "EE", admissionExam: "JEE Main", equivalentJeePercentile: 93.0, admissionMode: "Counseling" },
  // MAHE
  { collegeName: "MAHE Manipal", branchCode: "CSE", admissionExam: "MET", equivalentJeePercentile: 93.0, admissionMode: "Entrance Exam" },
  { collegeName: "MAHE Manipal", branchCode: "IT", admissionExam: "MET", equivalentJeePercentile: 91.0, admissionMode: "Entrance Exam" },
  { collegeName: "MAHE Manipal", branchCode: "ECE", admissionExam: "MET", equivalentJeePercentile: 87.0, admissionMode: "Entrance Exam" },
  // CU
  { collegeName: "Chandigarh University", branchCode: "CSE", admissionExam: "CUCET", equivalentJeePercentile: 70.0, admissionMode: "Entrance Exam" },
  { collegeName: "Chandigarh University", branchCode: "IT", admissionExam: "CUCET", equivalentJeePercentile: 68.0, admissionMode: "Entrance Exam" },
  { collegeName: "Chandigarh University", branchCode: "ECE", admissionExam: "CUCET", equivalentJeePercentile: 63.0, admissionMode: "Entrance Exam" },
  // Galgotias
  { collegeName: "Galgotias University", branchCode: "CSE", admissionExam: "JEE Main", equivalentJeePercentile: 65.0, admissionMode: "Direct" },
  { collegeName: "Galgotias University", branchCode: "IT", admissionExam: "JEE Main", equivalentJeePercentile: 63.0, admissionMode: "Direct" },
  { collegeName: "Galgotias University", branchCode: "ECE", admissionExam: "JEE Main", equivalentJeePercentile: 58.0, admissionMode: "Direct" },
  // RVITM
  { collegeName: "RV Institute of Technology and Management", branchCode: "CSE", admissionExam: "COMEDK", equivalentJeePercentile: 89.0, admissionMode: "Counseling" },
  { collegeName: "RV Institute of Technology and Management", branchCode: "IT", admissionExam: "COMEDK", equivalentJeePercentile: 87.0, admissionMode: "Counseling" },
  { collegeName: "RV Institute of Technology and Management", branchCode: "ECE", admissionExam: "COMEDK", equivalentJeePercentile: 83.0, admissionMode: "Counseling" },
  // DSCE
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "CSE", admissionExam: "COMEDK", equivalentJeePercentile: 80.0, admissionMode: "Counseling" },
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "IT", admissionExam: "COMEDK", equivalentJeePercentile: 78.0, admissionMode: "Counseling" },
  { collegeName: "Dayananda Sagar College of Engineering", branchCode: "ECE", admissionExam: "COMEDK", equivalentJeePercentile: 73.0, admissionMode: "Counseling" },
];

// ═══════════════════════════════════════════════════════════════════
// GENERATE XLSX FILES
// ═══════════════════════════════════════════════════════════════════

function makeSheet(data, headers) {
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const colWidths = headers.map((h) => {
    const maxLen = Math.max(h.length, ...data.map((r) => String(r[h] ?? "").length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;
  return ws;
}

const collegeHeaders = ["name", "state", "city", "officialApplyUrl", "website", "placementScore", "collegeLifeScore", "curriculumScore", "isPartner", "commissionRate", "nirf_ranking", "infra_rating", "startup_ecosystem", "research_output", "international_exposure"];
const branchHeaders = ["collegeName", "branchCode", "branchName", "tuitionFeeAnnual", "hostelFeeAnnual", "seatCapacity", "avgSalary", "medianSalary", "highestSalary", "minJeePercentileCutoff", "minClass12Cutoff", "branchStrengthScore", "placementPercentage"];
const scholarshipHeaders = ["collegeName", "name", "amountType", "amount", "description", "isActive", "criteria"];
const pathwayHeaders = ["collegeName", "branchCode", "admissionExam", "equivalentJeePercentile", "admissionMode"];

function writeOne(filename, data, headers, sheetName) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(data, headers), sheetName);
  XLSX.writeFile(wb, path.join(OUT_DIR, filename));
  console.log(`  ${filename} (${data.length} rows)`);
}

// ─── INDIVIDUAL TEMPLATES ─────────────────────────────────────────
writeOne("template_colleges.xlsx", [], collegeHeaders, "Colleges");
writeOne("template_branches.xlsx", [], branchHeaders, "Branches");
writeOne("template_scholarships.xlsx", [], scholarshipHeaders, "Scholarships");
writeOne("template_admission_pathways.xlsx", [], pathwayHeaders, "Pathways");

// ─── INDIVIDUAL DATA FILES ────────────────────────────────────────
writeOne("colleges_20.xlsx", colleges, collegeHeaders, "Colleges");
writeOne("branches_20.xlsx", branchData, branchHeaders, "Branches");
writeOne("scholarships_20.xlsx", scholarships, scholarshipHeaders, "Scholarships");
writeOne("admission_pathways_20.xlsx", pathways, pathwayHeaders, "Pathways");

// ─── MASTER COMBINED FILE (all 4 sheets) ──────────────────────────
const masterWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(masterWb, makeSheet(colleges, collegeHeaders), "1-Colleges");
XLSX.utils.book_append_sheet(masterWb, makeSheet(branchData, branchHeaders), "2-Branches");
XLSX.utils.book_append_sheet(masterWb, makeSheet(scholarships, scholarshipHeaders), "3-Scholarships");
XLSX.utils.book_append_sheet(masterWb, makeSheet(pathways, pathwayHeaders), "4-Pathways");
XLSX.writeFile(masterWb, path.join(OUT_DIR, "college_match_master_dataset.xlsx"));
console.log("  college_match_master_dataset.xlsx (MASTER — 4 sheets)");

// ─── SUMMARY ──────────────────────────────────────────────────────
console.log(`\nTotals:`);
console.log(`  Colleges:        ${colleges.length}`);
console.log(`  Branches:        ${branchData.length}`);
console.log(`  Scholarships:    ${scholarships.length}`);
console.log(`  Pathways:        ${pathways.length}`);

// Branch code breakdown
const branchCounts = {};
branchData.forEach(b => { branchCounts[b.branchCode] = (branchCounts[b.branchCode] || 0) + 1; });
console.log(`\nBranch breakdown:`);
Object.entries(branchCounts).sort().forEach(([code, count]) => {
  console.log(`  ${code}: ${count} branches`);
});

console.log(`\nOutput: ${OUT_DIR}`);
