import Link from "next/link";
import styles from "./home.module.css";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.floatingCircles}>
            <div className={`${styles.circle} ${styles.circle1}`} />
            <div className={`${styles.circle} ${styles.circle2}`} />
            <div className={`${styles.circle} ${styles.circle3}`} />
          </div>

          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span style={{ fontSize: "0.7rem" }}>✦</span>
              AI-Powered College Discovery
            </div>
            <h1 className={styles.title}>
              Find your <span className={styles.titleHighlight}>perfect college</span>
              <br />match in minutes
            </h1>
            <p className={styles.subtitle}>
              Data-driven recommendations based on placements, ROI, campus life, and your personal priorities. Not just rankings.
            </p>
            <div className={styles.heroActions}>
              <Link href="/predict" className={styles.ctaBtn}>
                Get My Matches <span>→</span>
              </Link>
              <Link href="/discover" className={styles.ctaBtnOutline}>
                Explore Colleges
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className={styles.peekingCardsContainer}>
          <Link href="/discover" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>🔍</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>Discover Colleges</h4>
              <p className={styles.cardText}>Filter by Placements & ROI</p>
            </div>
          </Link>

          <Link href="/predict" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>🏆</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>College Predictor</h4>
              <p className={styles.cardText}>Admissions Competitiveness</p>
            </div>
          </Link>

          <Link href="/rankings" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>📊</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>College Rankings</h4>
              <p className={styles.cardText}>ROI Flagship Analysis</p>
            </div>
          </Link>

          <Link href="/compare" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>⚡</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>Compare Colleges</h4>
              <p className={styles.cardText}>Side-by-Side Comparison</p>
            </div>
          </Link>
        </section>

        {/* Features Grid */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Why fit matters more than rank</h2>
          <p className={styles.sectionSubtitle}>
            Every student is different. Your college recommendation should be too.
          </p>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💼</div>
              <h3 className={styles.featureTitle}>Placement Quality</h3>
              <p className={styles.featureText}>
                Look beyond highest packages. Filter by branch-specific averages, median packages, and actual placement rates.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎓</div>
              <h3 className={styles.featureTitle}>Branch Specific Strength</h3>
              <p className={styles.featureText}>
                A college might be famous overall, but weak in CSE or ECE. We weigh departments and branches individually.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎪</div>
              <h3 className={styles.featureTitle}>Campus Life & Crowd</h3>
              <p className={styles.featureText}>
                Explore real college life indicators. Rate campus size, activities, student crowd demographics, and hostel infrastructure.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <h3 className={styles.featureTitle}>Soft Budget Cutoffs</h3>
              <p className={styles.featureText}>
                Exceeding budget by 10% for a much higher return? Our algorithm applies a smart penalty instead of filtering out.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📝</div>
              <h3 className={styles.featureTitle}>Competitive Fit</h3>
              <p className={styles.featureText}>
                We calculate admission probability (Safe, Target, Reach) based on JEE percentiles. Class 12 is eligibility only.
              </p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✨</div>
              <h3 className={styles.featureTitle}>Weight-Priority Sort</h3>
              <p className={styles.featureText}>
                Rank what you care about (e.g. ROI first, branch second). Our engine shifts results based on your priority weights.
              </p>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className={styles.socialProof}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>37+</div>
              <div className={styles.statLabel}>Colleges Listed</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>100+</div>
              <div className={styles.statLabel}>Branch Programs</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>50K+</div>
              <div className={styles.statLabel}>Data Points</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>Personalized</div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.copyText}>© 2026 kollegio. All rights reserved.</p>
          <p className={styles.footerNote}>Built for students who want data, not just vibes</p>
        </div>
      </footer>
    </div>
  );
}
