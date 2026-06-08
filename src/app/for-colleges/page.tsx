import Link from "next/link";
import Navbar from "@/components/Navbar";
import styles from "./colleges.module.css";

export default function ForCollegesPage() {
  return (
    <div className={styles.wrapper}>
      {/* Shared Navbar */}
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeadline}>Partner with CollegeMatch</h1>
            <p className={styles.heroSubheadline}>
              Connect with qualified students actively searching for the right B.Tech college. 
              Data-driven referrals that convert.
            </p>
            <a href="mailto:contact@collegematch.in" className={styles.ctaBtn}>
              Request a Demo <span style={{ fontSize: "1.1rem" }}>→</span>
            </a>
          </div>
        </section>

        {/* Why Partner Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Why Partner with CollegeMatch?</h2>
          </div>
          <div className={styles.whyGrid}>
            {/* Card 1 */}
            <div className={styles.whyCard}>
              <div className={styles.cardIcon}>🎯</div>
              <h3 className={styles.cardTitle}>Reach Qualified Students</h3>
              <p className={styles.cardText}>
                Get in front of students whose academic profile, budget, and preferences match your college. 
                No wasted impressions.
              </p>
            </div>

            {/* Card 2 */}
            <div className={styles.whyCard}>
              <div className={styles.cardIcon}>📊</div>
              <h3 className={styles.cardTitle}>Data-Driven Referrals</h3>
              <p className={styles.cardText}>
                Our recommendation engine matches students to your college based on 20+ weighted factors 
                including ROI, branch strength, and campus life.
              </p>
            </div>

            {/* Card 3 */}
            <div className={styles.whyCard}>
              <div className={styles.cardIcon}>💰</div>
              <h3 className={styles.cardTitle}>Performance-Based Model</h3>
              <p className={styles.cardText}>
                Pay only for enrolled students. Our commission-based model aligns incentives — 
                we succeed when you succeed.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className={styles.howSection}>
          <div className={styles.howContainer}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
            </div>
            <div className={styles.howGrid}>
              {/* Step 1 */}
              <div className={styles.howStep}>
                <div className={styles.stepNumber}>1</div>
                <h3 className={styles.stepTitle}>Sign Up</h3>
                <p className={styles.stepText}>
                  Register your college and configure branch-level details, fees, and placement data.
                </p>
              </div>

              {/* Step 2 */}
              <div className={styles.howStep}>
                <div className={styles.stepNumber}>2</div>
                <h3 className={styles.stepTitle}>Get Matched</h3>
                <p className={styles.stepText}>
                  Students discover your college through our Predictor, Rankings, and Discovery tools.
                </p>
              </div>

              {/* Step 3 */}
              <div className={styles.howStep}>
                <div className={styles.stepNumber}>3</div>
                <h3 className={styles.stepTitle}>Track & Grow</h3>
                <p className={styles.stepText}>
                  Monitor leads, track conversions, and manage commissions from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statBlock}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Students Matched</span>
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statNumber}>15+</span>
              <span className={styles.statLabel}>Partner Colleges</span>
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statNumber}>2.5x</span>
              <span className={styles.statLabel}>Avg Lead Conversion</span>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Ready to grow your admissions?</h2>
          <a href="mailto:contact@collegematch.in" className={styles.ctaBlockBtn}>
            Request a Demo
          </a>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/admin/login" className={styles.adminLink}>
              Or login to your dashboard
            </Link>
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
