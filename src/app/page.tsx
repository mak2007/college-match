import Link from "next/link";
import styles from "./home.module.css";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      <Navbar />

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section className={styles.hero}>
          {/* Floating background lights */}
          <div className={styles.floatingCircles}>
            <div className={`${styles.circle} ${styles.circle1}`} />
            <div className={`${styles.circle} ${styles.circle2}`} />
            <div className={`${styles.circle} ${styles.circle3}`} />
          </div>
          
          <div className={styles.heroContent}>
            <div className={styles.badge}>Data-backed college selection engine</div>
            <h1 className={styles.title}>
              Your one-stop solution for all things college apps
            </h1>
            <p className={styles.subtitle}>
              Get matched. Score scholarships. Ace essays. Get admission offers.
            </p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/predict" className={styles.ctaBtn}>
                Get My Matches <span style={{ fontSize: "1.1rem" }}>→</span>
              </Link>
              <Link href="/discover" className={styles.ctaBtn} style={{ backgroundColor: "transparent", color: "#ffffff", border: "2px solid #ffffff" }}>
                Explore Colleges
              </Link>
            </div>
          </div>
        </section>

        {/* Tilted Peeking Cards Section */}
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
              <h4 className={styles.cardTitle}>Predictor Quiz</h4>
              <p className={styles.cardText}>Admissions Competitiveness</p>
            </div>
          </Link>
          
          <Link href="/rankings" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>📊</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>Colleges Rankings</h4>
              <p className={styles.cardText}>ROI Flagship Analysis</p>
            </div>
          </Link>
          
          <Link href="/compare" className={styles.peekingCard}>
            <div className={styles.cardIconWrapper}>📄</div>
            <div className={styles.cardMeta}>
              <h4 className={styles.cardTitle}>Compare Colleges</h4>
              <p className={styles.cardText}>Compare Side-by-Side</p>
            </div>
          </Link>
        </section>

        {/* Features Grid */}
        <section className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>Why fit matters more than rank</h2>
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
                We calculate admission probability (Safe, Target, Reach) based on historical cutoffs of JEE percentiles and 12th marks.
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
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.copyText}>© 2026 kollegio. All rights reserved.</p>
          <p className={styles.footerNote}>Made for solo B.Tech founders validating private admissions</p>
        </div>
      </footer>
    </div>
  );
}
