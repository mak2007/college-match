import Link from "next/link";
import styles from "./home.module.css";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      {/* Header / Navbar */}
      <header className={styles.header}>
        <div className="container flex-center" style={{ justifyContent: "space-between", height: "70px" }}>
          <div className={styles.logo}>
            <span className={styles.logoGradient}>CollegeMatch</span>
          </div>
          <nav>
            <Link href="/admin/login" className={styles.navLink}>
              Partner Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container">
        <section className={styles.hero}>
          <div className={styles.badge}>Admissions B.Tech 2026</div>
          <h1 className={styles.title}>
            Discover Private Engineering Colleges <br />
            <span className={styles.titleGradient}>Matched to Your Priorities</span>
          </h1>
          <p className={styles.subtitle}>
            Don't choose your college purely by rank. CollegeMatch uses your budget, academic scores, 
            branch preferences, and personal priorities (placements, campus life, ROI) to match you 
            with the perfect private B.Tech institute.
          </p>
          <div className={styles.ctaGroup} style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/match" style={{ textDecoration: "none" }}>
              <LiquidButton size="xl">⚡ Live Matcher & Optimizer</LiquidButton>
            </Link>
            <Link href="/wizard" className="btn btn-secondary" style={{ fontSize: "1.1rem", padding: "1rem 2rem" }}>
              Classic B.Tech Wizard
            </Link>
          </div>
        </section>

        {/* Features / Value Grid */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Why fit matters more than rank</h2>
          <div className="grid-3">
            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>💼</div>
              <h3 className={styles.featureTitle}>Placement Quality</h3>
              <p className={styles.featureText}>
                Look beyond highest packages. Filter by branch-specific averages, median packages, and actual placement rates.
              </p>
            </div>
            
            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>🎓</div>
              <h3 className={styles.featureTitle}>Branch Specific strength</h3>
              <p className={styles.featureText}>
                A college might be famous overall, but weak in CSE or ECE. We weigh departments individually.
              </p>
            </div>

            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>🌴</div>
              <h3 className={styles.featureTitle}>Campus Vibe & Hostels</h3>
              <p className={styles.featureText}>
                Explore real college life indicators. Rate campus size, activities, sports facilities, and hostel infrastructure.
              </p>
            </div>

            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>💰</div>
              <h3 className={styles.featureTitle}>Soft Budget Cutoffs</h3>
              <p className={styles.featureText}>
                Exceeding budget by 10% for a much higher return? We apply a smart penalty instead of filtering out the college.
              </p>
            </div>

            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>📝</div>
              <h3 className={styles.featureTitle}>Competitive Fit</h3>
              <p className={styles.featureText}>
                We calculate your admission probability (Safe, Target, Reach) based on historical cutoffs of JEE percentiles and 12th marks.
              </p>
            </div>

            <div className="glass-card glow-effect">
              <div className={styles.featureIcon}>✨</div>
              <h3 className={styles.featureTitle}>Weight-Priority Sort</h3>
              <p className={styles.featureText}>
                Rank what you care about (e.g. ROI first, branch second). Our engine shifts results based on your personal weighting.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container flex-center" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p className={styles.copy}>© 2026 CollegeMatch. All rights reserved.</p>
          <div className={styles.footerLinks}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Made for solo B.Tech founders validating private admissions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
