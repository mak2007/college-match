-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "colleges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "brochureUrl" TEXT,
    "officialApplyUrl" TEXT NOT NULL,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "commissionRate" REAL NOT NULL DEFAULT 0.0,
    "placementScore" REAL NOT NULL,
    "collegeLifeScore" REAL NOT NULL,
    "curriculumScore" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "college_admin_profiles" (
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "collegeId"),
    CONSTRAINT "college_admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "college_admin_profiles_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "college_branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "tuitionFeeAnnual" REAL NOT NULL,
    "hostelFeeAnnual" REAL NOT NULL,
    "seatCapacity" INTEGER NOT NULL,
    "avgSalary" REAL,
    "medianSalary" REAL,
    "highestSalary" REAL,
    "minJeePercentileCutoff" REAL,
    "minClass12Cutoff" REAL,
    "branchStrengthScore" REAL NOT NULL,
    CONSTRAINT "college_branches_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "jeePercentile" REAL,
    "class12Percentage" REAL,
    "budgetLimit" REAL,
    "isBudgetConstraint" BOOLEAN NOT NULL DEFAULT true,
    "restrictLocation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "student_locations" (
    "studentId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    PRIMARY KEY ("studentId", "state", "city"),
    CONSTRAINT "student_locations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "student_priorities" (
    "studentId" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "rankOrder" INTEGER NOT NULL,

    PRIMARY KEY ("studentId", "criteria"),
    CONSTRAINT "student_priorities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "matchScore" REAL NOT NULL,
    "rankPosition" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recommendations_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REFERRED',
    "trackingToken" TEXT NOT NULL,
    "referredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedAt" DATETIME NOT NULL,
    CONSTRAINT "leads_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "leads_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "commission_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "amountDue" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceDate" DATETIME,
    "paymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "commission_transactions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_slug_key" ON "colleges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "college_branches_collegeId_branchCode_key" ON "college_branches"("collegeId", "branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_key" ON "students"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "student_priorities_studentId_rankOrder_key" ON "student_priorities"("studentId", "rankOrder");

-- CreateIndex
CREATE UNIQUE INDEX "leads_trackingToken_key" ON "leads"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "commission_transactions_leadId_key" ON "commission_transactions"("leadId");
