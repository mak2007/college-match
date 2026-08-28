"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

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

function StudentLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard/student";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // After auth, check for pending quiz data and complete the flow
  const handlePostAuth = async (): Promise<string> => {
    try {
      const pendingQuiz = localStorage.getItem("cm_pending_quiz");
      if (pendingQuiz) {
        const quizData = JSON.parse(pendingQuiz);
        const res = await fetch("/api/recommendations/from-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizData }),
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.student_id) {
          localStorage.removeItem("cm_pending_quiz");
          return `/results?student_id=${data.student_id}`;
        }
      }
    } catch (e) {
      console.error("Error processing pending quiz:", e);
    }
    return redirectUrl;
  };

  const handleInstantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      const finalRedirect = await handlePostAuth();
      router.push(finalRedirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <AsteriskIcon />
          <span>kollegio</span>
        </Link>
      </header>

      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Access Your Matches</h2>
          <p className={styles.subtitle}>
            Enter your email address to unlock your personalized college recommendations and dashboard.
          </p>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleInstantSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Your Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Aarav Mehta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="aarav@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "Accessing Dashboard..." : "Continue to Dashboard →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StudentLogin() {
  return (
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <div className={styles.container}>
            <div className={styles.card} style={{ textAlign: "center" }}>
              <h2 style={{ color: "#0F2D52", marginBottom: "0.5rem" }}>Loading...</h2>
            </div>
          </div>
        </div>
      }
    >
      <StudentLoginContent />
    </Suspense>
  );
}
