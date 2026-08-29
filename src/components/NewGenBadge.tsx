import React from "react";
import styles from "./newGenBadge.module.css";

export default function NewGenBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`${styles.badgeWrapper} ${styles[size]}`}>
      {/* Ambient floating sparkle stars */}
      <span className={`${styles.sparkle} ${styles.sparkleTopLeft}`}>✦</span>
      <span className={`${styles.sparkle} ${styles.sparkleBottomLeft}`}>✦</span>
      <span className={`${styles.sparkle} ${styles.sparkleBottomRight}`}>✦</span>

      <span className={styles.outerGlowRing}>
        <span className={styles.innerPill}>
          {/* Main 4-point Sparkle SVG */}
          <span className={styles.sparkleIconGroup}>
            <svg
              className={styles.mainSparkleSvg}
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0L14.7 9.3L24 12L14.7 14.7L12 24L9.3 14.7L0 12L9.3 9.3L12 0Z" />
            </svg>
            <svg
              className={styles.miniSparkleSvg}
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0L14.7 9.3L24 12L14.7 14.7L12 24L9.3 14.7L0 12L9.3 9.3L12 0Z" />
            </svg>
          </span>

          <span className={styles.badgeText}>New-Gen AI</span>
        </span>
      </span>
    </span>
  );
}
