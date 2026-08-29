"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.layoutContainer}>
      {/* Clean Minimal Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/super" className={styles.logo}>
            CollegeMatch
          </Link>
          <span className={styles.adminTag}>Admin Portal</span>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/admin/super"
            className={`${styles.navLink} ${pathname === "/admin/super" || pathname === "/admin/super/colleges" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>🏫</span> Colleges & Excel Ingest
          </Link>
          <Link
            href="/admin/super/config"
            className={`${styles.navLink} ${pathname === "/admin/super/config" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>⚙️</span> Scoring Rules
          </Link>
          <Link
            href="/discover"
            target="_blank"
            className={styles.navLink}
          >
            <span className={styles.navIcon}>🔍</span> View Live App ↗
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminEmail}>
            admin@collegematch.in
          </div>
          <Link href="/" className={styles.logoutBtn} style={{ textAlign: "center", textDecoration: "none", display: "block" }}>
            Exit to Home
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
