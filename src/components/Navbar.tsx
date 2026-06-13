"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";

const AsteriskIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    stroke="currentColor"
    strokeWidth="3.5"
    strokeLinecap="round"
    fill="none"
    style={{ color: "#C4A484" }}
  >
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="6.34" y1="6.34" x2="17.66" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="6.34" y2="17.66" />
  </svg>
);

const STUDENT_LINKS = [
  { href: "/discover", icon: "🔍", title: "Discover Colleges", desc: "Search & filter by placements, ROI, fees" },
  { href: "/predict", icon: "🎯", title: "College Predictor", desc: "Get personalized match scores" },
  { href: "/rankings", icon: "📊", title: "College Rankings", desc: "Compare by ROI, placements, curriculum" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
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
          {/* Left: Logo */}
          <Link href="/" className={styles.logoLink}>
            <AsteriskIcon />
            <span>kollegio</span>
          </Link>

          {/* Center: Navigation */}
          <nav className={styles.centerNav}>
            {/* For Students dropdown */}
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.dropdownTrigger}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={isStudentRoute ? { color: "#0F2D52" } : undefined}
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

            {/* For Colleges */}
            <Link
              href="/for-colleges"
              className={`${styles.navLink} ${
                pathname === "/for-colleges" ? styles.navLinkActive : ""
              }`}
            >
              For Colleges
            </Link>
          </nav>

          {/* Right: Actions */}
          <div className={styles.rightActions}>
            <Link href="/login" className={styles.loginLink}>
              Login
            </Link>
            <Link href="/login?mode=signup" className={styles.signUpBtn}>
              Sign Up <span style={{ fontSize: "0.85rem" }}>→</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
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

      {/* Mobile Drawer */}
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
