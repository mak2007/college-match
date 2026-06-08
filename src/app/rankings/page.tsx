import { prisma } from "@/lib/db";
import Link from "next/link";
import styles from "./rankings.module.css";
import RankingsClient from "./RankingsClient";

export default async function RankingsPage() {
  const colleges = await prisma.college.findMany({
    include: {
      branches: true,
    },
  });

  return (
    <div className={styles.wrapper}>
      {/* Navbar Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link href="/" className={styles.logoLink}>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              style={{ color: "#10b981", marginRight: "0.2rem" }}
            >
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="6.34" y1="6.34" x2="17.66" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="6.34" y2="17.66" />
            </svg>
            <span>kollegio</span>
          </Link>
          <nav className={styles.nav}>
            <Link href="/discover" className={styles.navLink}>
              Discover Colleges
            </Link>
            <Link href="/predict" className={styles.navLink}>
              Predictor
            </Link>
            <Link href="/rankings" className={`${styles.navLink} ${styles.navLinkActive}`}>
              Rankings
            </Link>
            <Link href="/compare" className={styles.navLink}>
              Compare
            </Link>
          </nav>
          <div className={styles.headerActions}>
            <Link href="/predict" className={styles.ctaBtn}>
              Get My Matches
            </Link>
          </div>
        </div>
      </header>

      {/* Rankings Workspace */}
      <RankingsClient initialColleges={colleges} />

      {/* Footer */}
      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid var(--light-border)", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
