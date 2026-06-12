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

  const handleGoogleLogin = () => {
    setError("");
    setLoading(true);
    // Simulated Google login for demo
    setTimeout(async () => {
      try {
        const dummyEmail = `student_${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: dummyEmail,
            password: "GoogleAuth_" + Date.now(),
            name: "Google User",
          }),
        });

        if (res.ok) {
          const finalRedirect = await handlePostAuth();
          router.push(finalRedirect);
          router.refresh();
        } else {
          // User might already exist, try login
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: dummyEmail, password: "GoogleAuth_" + Date.now() }),
          });
          if (loginRes.ok) {
            const finalRedirect = await handlePostAuth();
            router.push(finalRedirect);
            router.refresh();
          } else {
            setError("Google authentication failed. Please try email login.");
            setLoading(false);
          }
        }
      } catch (err) {
        setError("Google authentication service is currently unavailable");
        setLoading(false);
      }
    }, 800);
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

          <button className={styles.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: "4px" }}>
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.68-5.32 3.68-8.74z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.54 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.23A12 12 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.45 14.33a7.22 7.22 0 0 1 0-4.66V6.44H1.31a12 12 0 0 0 0 11.12l4.14-3.23z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.31 6.44l4.14 3.23c.92-2.77 3.5-4.83 6.55-4.83z"
              />
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>or</div>

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
