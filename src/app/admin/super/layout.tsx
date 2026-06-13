"use client";
import { AuthProvider } from "@/app/provider/AuthProvider";
import Link from "next/link";
import styles from "./layout.module.css";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The AuthProvider will handle authentication and redirection.
  const email = "admin@collegematch.in"; // placeholder – actual email is provided by AuthProvider if needed.

  return (
    <AuthProvider>
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
            <div className={styles.adminEmail} title={email}>
              {email}
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
    </AuthProvider>
  );
}

