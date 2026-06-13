"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";

const LogoIcon = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="0.5" stopColor="#06b6d4" />
        <stop offset="1" stopColor="#84cc16" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
    <path d="M10 22V12l6-4 6 4v10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 22v-6h6v6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STUDENT_LINKS = [
  { href: "/discover", icon: "🔍", title: "Discover Colleges", desc: "Search & filter by placements, ROI" },
  { href: "/predict", icon: "🎯", title: "College Predictor", desc: "Get personalized match scores" },
  { href: "/rankings", icon: "📊", title: "College Rankings", desc: "Compare by ROI, placements, curriculum" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const isStudentRoute = ["/discover", "/predict", "/rankings"].some((r) =>
    pathname.startsWith(r)
  );

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <LogoIcon />
            <span>kollegio</span>
          </Link>

          <nav className={styles.centerNav}>
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.dropdownTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={isStudentRoute ? { color: "var(--blue-600)" } : undefined}
              >
                For Students
                <span className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ""}`}>
                  ▾
                </span>
              </button>

              <div
                className={`${styles.dropdownPanel} ${dropdownOpen ? styles.dropdownPanelOpen : ""}`}
              >
                {STUDENT_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.dropdownLink} ${
                      pathname.startsWith(link.href) ? styles.dropdownLinkActive : ""
                    }`}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className={styles.dropdownLinkTitle}>
                      {link.icon} {link.title}
                    </span>
                    <span className={styles.dropdownLinkDesc}>{link.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/for-colleges"
              className={`${styles.navLink} ${
                pathname === "/for-colleges" ? styles.navLinkActive : ""
              }`}
            >
              For Colleges
            </Link>
          </nav>

          <div className={styles.rightActions}>
            <Link href="/login" className={styles.loginLink}>
              Login
            </Link>
            <Link href="/login?mode=signup" className={styles.signUpBtn}>
              Sign Up <span style={{ fontSize: "0.8rem" }}>→</span>
            </Link>
          </div>

          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <div className={styles.hamburgerIcon}>
              <span />
              <span />
              <span />
            </div>
          </button>
        </div>
      </header>

      <div className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ""}`}>
        <div className={styles.mobileSection}>
          <div className={styles.mobileSectionTitle}>For Students</div>
          {STUDENT_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.mobileLink}>
              {link.icon} {link.title}
            </Link>
          ))}
        </div>

        <div className={styles.mobileSection}>
          <div className={styles.mobileSectionTitle}>For Colleges</div>
          <Link href="/for-colleges" className={styles.mobileLink}>
            🏫 Partner with Us
          </Link>
        </div>

        <div className={styles.mobileCta}>
          <Link href="/login?mode=signup" className={styles.signUpBtn} style={{ justifyContent: "center" }}>
            Sign Up →
          </Link>
          <Link
            href="/login"
            className={styles.loginLink}
            style={{ textAlign: "center", padding: "0.75rem" }}
          >
            Login
          </Link>
        </div>
      </div>
    </>
  );
}
