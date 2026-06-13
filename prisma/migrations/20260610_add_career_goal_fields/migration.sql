-- CreateEnum
CREATE TYPE "CareerGoal" AS ENUM ('PLACEMENT', 'STARTUP', 'HIGHER_STUDIES_INDIA', 'HIGHER_STUDIES_ABROAD', 'GOVERNMENT_EXAMS', 'NOT_SURE');

-- AlterTable
ALTER TABLE "colleges" ADD COLUMN "website" TEXT;

-- AlterTable
ALTER TABLE "college_branches" ADD COLUMN "placementPercentage" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "students" ADD COLUMN "careerGoal" "CareerGoal" DEFAULT 'NOT_SURE';
ALTER TABLE "students" ADD COLUMN "examType" TEXT;