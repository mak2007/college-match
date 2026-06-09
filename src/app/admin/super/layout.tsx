"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import styles from "./layout.module.css";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, refreshSession, setLastVisitedPath } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track last visited path for refresh preservation
  useEffect(() => {
    if (mounted && !loading && pathname) {
      setLastVisitedPath(pathname);
    }
  }, [pathname, mounted, loading, setLastVisitedPath]);

  // Refresh session on mount if user exists
  useEffect(() => {
    if (mounted && !loading && user) {
      // Auto-refresh token if needed
      refreshSession();
    }
  }, [mounted, loading, user, refreshSession]);

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  if (!mounted || loading) {
    return (
      <div className={styles.layoutContainer}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <div className={styles.logo}>CollegeMatch</div>
            <span className={styles.adminTag}>Superadmin</span>
          </div>
          <nav className={styles.nav}>
            <div className={styles.navLink} style={{ opacity: 0.5 }}>Loading...</div>
          </nav>
        </aside>
        <main className={styles.mainContent}>
          <div className={styles.loadingOverlay}>Loading dashboard...</div>
        </main>
      </div>
    );
  }

  if (!user || user.role !== "SUPERADMIN") {
    return (
      <div className={styles.layoutContainer}>
        <main className={styles.mainContent}>
          <div className="glass-card text-center" style={{ margin: "5rem auto", maxWidth: "500px" }}>
            <h2>Access Denied</h2>
            <p style={{ color: "var(--text-secondary)", margin: "1rem 0" }}>
              Super Admin access required.
            </p>
            <Link href="/admin/login" className="btn btn-primary">Go to Login</Link>
          </div>
        </main>
      </div>
    );
  }

  const email = user.email;

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
          <Link
            href="/admin/super"
            className={`${styles.navLink} ${pathname === "/admin/super" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>📊</span> Dashboard Overview
          </Link>
          <Link
            href="/admin/super/colleges"
            className={`${styles.navLink} ${pathname === "/admin/super/colleges" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>🏫</span> Colleges Registry
          </Link>
          <Link
            href="/admin/super/config"
            className={`${styles.navLink} ${pathname === "/admin/super/config" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>⚙️</span> Scoring Config
          </Link>
          <Link
            href="/admin/super/leads"
            className={`${styles.navLink} ${pathname === "/admin/super/leads" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>📋</span> Leads Pipeline
          </Link>
          <Link
            href="/admin/super/commissions"
            className={`${styles.navLink} ${pathname === "/admin/super/commissions" ? styles.navLinkActive : ""}`}
          >
            <span className={styles.navIcon}>💰</span> Commission Billing
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminEmail} title={email}>
            {email}
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
