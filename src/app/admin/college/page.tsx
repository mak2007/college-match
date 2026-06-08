import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import * as jwt from "jsonwebtoken";
import LeadsTable from "./LeadsTable";
import styles from "./college.module.css";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me_12345";

export default async function CollegeAdminDashboard() {
  // 1. Verify Authentication & Role
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;

  let decoded: any = null;
  try {
    if (token) {
      decoded = jwt.verify(token, JWT_SECRET);
    }
  } catch (e) {
    // Ignore, will redirect
  }

  if (!decoded || decoded.role !== "COLLEGE_ADMIN") {
    redirect("/admin/login");
  }

  const collegeId = decoded.collegeId;

  if (!collegeId) {
    return (
      <div className={styles.errorWrapper}>
        <div className="glass-card text-center" style={{ maxWidth: "500px" }}>
          <h2>No Associated College Profile</h2>
          <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>
            This account is not associated with any college profile. Please contact the administrator.
          </p>
          <Link href="/api/auth/logout" className="btn btn-primary">
            Logout
          </Link>
        </div>
      </div>
    );
  }

  // 2. Fetch College and Leads details
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    include: {
      branches: true,
    },
  });

  if (!college) {
    redirect("/admin/login");
  }

  const leads = await prisma.lead.findMany({
    where: { collegeId },
    orderBy: { referredAt: "desc" },
    include: {
      student: true,
    },
  });

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <div className={styles.logo}>
            CollegeMatch <span className={styles.collegeTag}>Partner Portal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className={styles.collegeNameHeader}>🏫 {college.name}</span>
            <Link href="/api/auth/logout" className={styles.logoutBtn}>
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "3rem 1.5rem" }}>
        {/* Page title info */}
        <section style={{ marginBottom: "2rem" }}>
          <h1 className={styles.title}>Welcome Back, Administrator</h1>
          <p className={styles.subtitle}>
            Manage your student referrals, review eligibility cutoffs, and track conversions.
          </p>
        </section>

        {/* Leads Interactive Table */}
        <LeadsTable 
          initialLeads={leads} 
          collegeName={college.name} 
          commissionRate={Number(college.commissionRate)}
        />
      </main>
    </div>
  );
}
