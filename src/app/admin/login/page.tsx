"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import styles from "./login.module.css";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login, setLastVisitedPath } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use auth context login to set user state globally
      await login(email, password);

      // Determine target URL
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      const role = data?.user?.role;
      const targetUrl = redirectUrl || (role === "SUPERADMIN" ? "/admin/super" : role === "COLLEGE_ADMIN" ? "/admin/college" : null);

      if (!targetUrl) {
        throw new Error("Unauthorized role");
      }

      setLastVisitedPath(targetUrl);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("cm_last_path", targetUrl);
      }

      router.push(targetUrl);
    } catch (err: any) {
      console.error("Login client error:", err);
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          CollegeMatch
        </Link>
      </header>

      <div className={styles.container}>
        <div className="glass-card animate-slide" style={{ width: "100%", maxWidth: "420px" }}>
          <h2 className={styles.title}>Partner Portal Login</h2>
          <p className={styles.subtitle}>Sign in as Superadmin or College Administrator</p>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. admin@collegematch.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary glow-effect" style={{ width: "100%", marginTop: "1.5rem" }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className={styles.helpText}>
            <strong>Demo Credentials:</strong> <br />
            - Superadmin: <code>admin@collegematch.in</code> / <code>AdminPass123!</code> <br />
            - College Admin: <code>admissions@vit.edu</code> / <code>CollegePass123!</code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className="glass-card text-center" style={{ width: "100%", maxWidth: "420px" }}>
            <h2 className={styles.title}>Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
