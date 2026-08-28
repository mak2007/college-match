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
  const isSignupMode = searchParams.get("mode") === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let finalRedirect = redirectUrl;

      if (isSignupMode) {
        // Signup: create user via register endpoint
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Signup failed");
        }

        // Check for pending quiz data after signup
        finalRedirect = await handlePostAuth();
      } else {
        // Login
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Login failed");
        }

        // Check for pending quiz data after login
        finalRedirect = await handlePostAuth();
      }

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
          <h2 className={styles.title}>{isSignupMode ? "Create your account" : "Welcome back"}</h2>
          <p className={styles.subtitle}>
            {isSignupMode
              ? "Sign up to unlock personalized college recommendations and save your results"
              : "Sign in to access your dashboard and saved results"}
          </p>

          {error && <div className={styles.errorAlert}>{error}</div>}
          {success && <div className={styles.successAlert}>{success}</div>}

          <form onSubmit={handleEmailPasswordSubmit} className={styles.form}>
            {isSignupMode && (
              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (isSignupMode ? "Creating account..." : "Signing in...") : (isSignupMode ? "Create Account" : "Sign In")}
            </button>
          </form>

          <div className={styles.modeToggle}>
            {isSignupMode ? (
              <p>Already have an account? <Link href={`/login${redirectUrl !== '/dashboard/student' ? `?redirect=${redirectUrl}` : ''}`}>Log in</Link></p>
            ) : (
              <p>Don&apos;t have an account? <Link href={`/login?mode=signup${redirectUrl !== '/dashboard/student' ? `&redirect=${redirectUrl}` : ''}`}>Sign up</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentLogin() {
  return (
    <Suspense fallback={
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.card} style={{ textAlign: "center" }}>
            <h2 style={{ color: "#0F2D52", marginBottom: "0.5rem" }}>Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <StudentLoginContent />
    </Suspense>
  );
}
