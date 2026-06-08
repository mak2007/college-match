import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as jwt from "jsonwebtoken";
import Link from "next/link";
import styles from "./layout.module.css";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me_12345";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verify Authentication & Role on Server
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

  if (!decoded || decoded.role !== "SUPERADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/super" className={styles.logo}>
            CollegeMatch
          </Link>
          <span className={styles.adminTag}>Superadmin</span>
        </div>

        <nav className={styles.nav}>
          <Link href="/admin/super" className={styles.navLink}>
            <span className={styles.navIcon}>📊</span> Dashboard Overview
          </Link>
          <Link href="/admin/super/colleges" className={styles.navLink}>
            <span className={styles.navIcon}>🏫</span> Colleges Registry
          </Link>
          <Link href="/admin/super/config" className={styles.navLink}>
            <span className={styles.navIcon}>⚙️</span> Scoring Config
          </Link>
          <Link href="/admin/super/leads" className={styles.navLink}>
            <span className={styles.navIcon}>📋</span> Leads Pipeline
          </Link>
          <Link href="/admin/super/commissions" className={styles.navLink}>
            <span className={styles.navIcon}>💰</span> Commission Billing
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminEmail} title={decoded.email}>
            {decoded.email}
          </div>
          <Link href="/api/auth/logout" className={styles.logoutBtn}>
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
