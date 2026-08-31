import Link from "next/link";
import styles from "./home.module.css";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className={styles.wrapper}>
      {/* Ambient background 3D glass spheres & glowing orbs */}
      <div className={styles.ambientBackground}>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
        <div className={`${styles.orb} ${styles.orb4}`} />
        <div className={styles.subtleOrbitalLine} />
      </div>

      <Navbar />

      <main className={styles.mainContainer}>
        {/* ─── HERO SECTION: ASYMMETRIC SPLIT ─── */}
        <section className={styles.heroSection}>
          <div className={styles.heroGrid}>
            {/* ── LEFT COLUMN: HEADLINE & ACTIONS ── */}
            <div className={styles.heroLeft}>
              {/* Built for your future badge */}
              <div className={styles.heroPill}>
                <span className={styles.starIcon}>★</span>
                <span>BUILT FOR YOUR FUTURE</span>
              </div>

              {/* Main Editorial Headline */}
              <h1 className={styles.heroHeadline}>
                Don’t just find<br />
                a college,<br />
                <span className={styles.gradientText}>
                  find your{" "}
                  <span className={styles.placeHighlight}>
                    place.
                    {/* Curved swoosh underline strictly under the word "place." */}
                    <svg
                      className={styles.placeUnderlineSvg}
                      viewBox="0 0 140 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M3 8C40 15 100 14 137 6"
                        stroke="#6366F1"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Radiant sparkle ticks at top-right of "place." */}
                    <svg
                      className={styles.sparkleTicksSvg}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 19L11 12M15 5L16 13M3 9L9 9"
                        stroke="#6366F1"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Supporting Copy */}
              <p className={styles.heroDescription}>
                Discover colleges that match your goals and ambitions.<br className={styles.hideOnMobile} />
                Find the people, opportunities and experiences<br className={styles.hideOnMobile} />
                that shape who you’re meant to become.
              </p>

              {/* Action Buttons */}
              <div className={styles.heroBtnsRow}>
                <Link href="/predict" className={styles.primaryHeroBtn}>
                  <span>Find My Match</span>
                  <span className={styles.btnArrow}>→</span>
                </Link>
                <Link href="/results?tab=generic" className={styles.secondaryHeroBtn}>
                  <span>Explore Colleges</span>
                  <span className={styles.playIconBox}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </span>
                </Link>
              </div>

              {/* Dot matrix decorative pattern */}
              <div className={styles.dotMatrix} aria-hidden="true">
                {[...Array(18)].map((_, i) => (
                  <span key={i} className={styles.dot} />
                ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN: ASPIRATIONAL CAMPUS PHOTOGRAPHY & FLOATING PANEL ── */}
            <div className={styles.heroRight}>
              <div className={styles.campusCardWrapper}>
                {/* Large elegant rounded campus frame */}
                <div className={styles.campusImageFrame}>
                  <img
                    src="/bits-pilani-campus.jpg"
                    alt="Iconic Premier Indian University Campus"
                    className={styles.campusImage}
                  />
                  <div className={styles.campusGlowOverlay} />
                </div>

                {/* Overlapping Floating Glass Dashboard Panel */}
                <div className={styles.floatingBenefitsPanel}>
                  {/* Benefit 1 */}
                  <div className={styles.benefitItem}>
                    <div className={`${styles.benefitIconBox} ${styles.iconTarget}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                    <div className={styles.benefitText}>
                      <h4 className={styles.benefitTitle}>Get matched.</h4>
                      <p className={styles.benefitSubtitle}>Find colleges that fit your goals.</p>
                    </div>
                  </div>

                  {/* Benefit 2 */}
                  <div className={styles.benefitItem}>
                    <div className={`${styles.benefitIconBox} ${styles.iconTrophy}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34" />
                        <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
                      </svg>
                    </div>
                    <div className={styles.benefitText}>
                      <h4 className={styles.benefitTitle}>Score scholarships.</h4>
                      <p className={styles.benefitSubtitle}>Find and win scholarships that you deserve.</p>
                    </div>
                  </div>

                  {/* Benefit 3 */}
                  <div className={styles.benefitItem}>
                    <div className={`${styles.benefitIconBox} ${styles.iconDoc}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div className={styles.benefitText}>
                      <h4 className={styles.benefitTitle}>Get admission offers.</h4>
                      <p className={styles.benefitSubtitle}>Receive offers from colleges that want you.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3 PREMIUM FEATURE CARDS (BELOW HERO) ─── */}
        <section className={styles.featureCardsSection}>
          <div className={styles.featureCardsGrid}>
            {/* Card 1: College Predictor */}
            <Link href="/predict" className={styles.featureCard}>
              <div className={`${styles.featureCardIcon} ${styles.iconColorTrophy}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div className={styles.featureCardMeta}>
                <h3 className={styles.featureCardTitle}>College Predictor</h3>
                <p className={styles.featureCardDesc}>Get personalized match scores & chances</p>
              </div>
              <div className={styles.cardArrowCircle}>
                <span>→</span>
              </div>
            </Link>

            {/* Card 2: New-Gen Colleges */}
            <Link href="/results?tab=new_gen" className={styles.featureCard}>
              <div className={`${styles.featureCardIcon} ${styles.iconColorSearch}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className={styles.featureCardMeta}>
                <h3 className={styles.featureCardTitle}>New-Gen Colleges</h3>
                <p className={styles.featureCardDesc}>Modern AI & practical tech institutes</p>
              </div>
              <div className={styles.cardArrowCircle}>
                <span>→</span>
              </div>
            </Link>

            {/* Card 3: Overall College Rankings */}
            <Link href="/results?tab=generic" className={styles.featureCard}>
              <div className={`${styles.featureCardIcon} ${styles.iconColorChart}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div className={styles.featureCardMeta}>
                <h3 className={styles.featureCardTitle}>Overall College Rankings</h3>
                <p className={styles.featureCardDesc}>Complete national engineering rankings</p>
              </div>
              <div className={styles.cardArrowCircle}>
                <span>→</span>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* Clean minimal footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.copyText}>© 2026 Kollegio. All rights reserved.</p>
          <div className={styles.footerNav}>
            <div className={styles.footerGroup}>
              <span className={styles.footerGroupLabel}>Help:</span>
              <Link href="#contact" className={styles.footerLink}>Contact Us</Link>
              <Link href="#privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link href="#terms" className={styles.footerLink}>Terms</Link>
            </div>
            <div className={styles.footerDivider} aria-hidden="true" />
            <div className={styles.footerGroup}>
              <span className={styles.footerGroupLabel}>Follow Us:</span>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
                aria-label="Follow us on Instagram"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
