"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";

const KollegioLogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L28 8.9282V23.0718L16 30L4 23.0718V8.9282L16 2Z" fill="url(#kollegio_grad_1)" />
    <path d="M16 2L28 8.9282L16 16L4 8.9282L16 2Z" fill="url(#kollegio_grad_top)" />
    <path d="M16 16L28 8.9282V23.0718L16 30V16Z" fill="url(#kollegio_grad_right)" />
    <path d="M16 16V30L4 23.0718V8.9282L16 16Z" fill="url(#kollegio_grad_left)" />
    <path d="M16 8L22 11.5L16 15L10 11.5L16 8Z" fill="#ffffff" fillOpacity="0.35" />
    <defs>
      <linearGradient id="kollegio_grad_1" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4338CA" />
      </linearGradient>
      <linearGradient id="kollegio_grad_top" x1="4" y1="2" x2="28" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818CF8" />
        <stop offset="1" stopColor="#6366F1" />
      </linearGradient>
      <linearGradient id="kollegio_grad_right" x1="16" y1="8" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#3730A3" />
      </linearGradient>
      <linearGradient id="kollegio_grad_left" x1="4" y1="8" x2="16" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
  </svg>
);

const STUDENT_LINKS = [
  { href: "/predict", icon: "🎯", title: "College Predictor", desc: "Get personalized match scores" },
  { href: "/results?tab=new_gen", icon: "🚀", title: "New-Gen Colleges", desc: "Modern AI & practical tech institutes" },
  { href: "/rankings", icon: "📊", title: "Overall College Rankings", desc: "Complete national engineering rankings" },
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

  const isStudentRoute = ["/discover", "/predict", "/rankings", "/compare"].some((r) =>
    pathname.startsWith(r)
  ) || pathname === "/";

  return (
    <>
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          {/* Left: Logo */}
          <Link href="/" className={styles.logoLink}>
            <KollegioLogoIcon />
            <span className={styles.brandName}>Kollegio</span>
          </Link>

          {/* Center: Navigation */}
          <nav className={styles.centerNav}>
            {/* For Students dropdown */}
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                className={`${styles.dropdownTrigger} ${isStudentRoute ? styles.navActiveWithUnderline : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
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
                pathname === "/for-colleges" ? styles.navActiveWithUnderline : ""
              }`}
            >
              For Colleges
            </Link>
          </nav>

          {/* Right: Actions */}
          <div className={styles.rightActions}>
            <Link href="/predict" className={styles.signUpBtn}>
              Find My Match <span style={{ fontSize: "0.95rem" }}>→</span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <div className={`${styles.hamburgerIcon} ${mobileOpen ? styles.hamburgerIconOpen : ""}`}>
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
          <Link href="/predict" className={styles.signUpBtn} style={{ justifyContent: "center" }}>
            Find My Match →
          </Link>
        </div>
      </div>
    </>
  );
}
