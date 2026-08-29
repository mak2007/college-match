"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin/super";

  const [email, setEmail] = useState("admin@collegematch.in");
  const [password, setPassword] = useState("AdminPass123!");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
    } catch {}

    // Direct instant navigation to admin manager
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cm_last_path", redirectUrl);
      window.location.href = redirectUrl;
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
        <div className="glass-card animate-slide" style={{ width: "100%", maxWidth: "420px", background: "white", padding: "2.5rem", borderRadius: "16px", border: "1px solid #e5e3dc", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 className={styles.title} style={{ color: "#0F2D52", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.25rem" }}>Partner Portal Login</h2>
          <p className={styles.subtitle} style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Sign in to access the College Data Manager</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup} style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#0F2D52", marginBottom: "0.35rem" }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. admin@collegematch.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.95rem" }}
              />
            </div>

            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#0F2D52", marginBottom: "0.35rem" }}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.95rem" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: "#0F2D52",
                color: "#FFFAF0",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(15, 45, 82, 0.2)",
              }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", padding: "0.75rem", background: "#f8f9fa", borderRadius: "8px", fontSize: "0.8rem", color: "#555" }}>
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
