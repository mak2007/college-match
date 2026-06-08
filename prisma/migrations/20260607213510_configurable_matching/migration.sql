-- AlterTable
ALTER TABLE "college_branches" ADD COLUMN "metadata" TEXT;

-- AlterTable
ALTER TABLE "colleges" ADD COLUMN "metadata" TEXT;

-- CreateTable
CREATE TABLE "system_configs" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
