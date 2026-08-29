import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import LeadsTable from "./LeadsTable";
import LogoutButton from "@/components/LogoutButton";
import styles from "./college.module.css";

export const dynamic = "force-dynamic";

export default async function CollegeAdminDashboard() {
  // 1. Retrieve user details
  let decoded: any = null;
  let collegeId: string | null = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;
    decoded = token ? await verifyToken(token) : null;
    collegeId = decoded?.collegeId || null;
  } catch (err) {
    console.error("Auth token parse error:", err);
  }

  if (!decoded || !collegeId) {
    return (
      <div className={styles.wrapper}>
        <div className="container" style={{ padding: "3rem 1.5rem" }}>
          <h2>Partner Portal Login Required</h2>
        </div>
      </div>
    );
  }

  // 2. Fetch College and Leads details
  let college: any = null;
  let leads: any[] = [];

  try {
    college = await prisma.college.findUnique({
      where: { id: collegeId },
      include: {
        branches: true,
      },
    });

    if (college) {
      leads = await prisma.lead.findMany({
        where: { collegeId },
        orderBy: { referredAt: "desc" },
        include: {
          student: true,
        },
      });
    }
  } catch (err) {
    console.error("College admin fetch error:", err);
  }

  if (!college) {
    return (
      <div className={styles.errorWrapper}>
        <div className="glass-card text-center" style={{ maxWidth: "500px" }}>
          <h2>College Profile Not Found</h2>
          <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>
            The college profile associated with this account could not be found.
          </p>
          <LogoutButton className="btn btn-primary">
            Logout
          </LogoutButton>
        </div>
      </div>
    );
  }

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
            <LogoutButton className={styles.logoutBtn}>
              Logout
            </LogoutButton>
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
