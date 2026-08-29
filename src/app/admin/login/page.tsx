"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLogin() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/admin/super";
    }
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFAF0", fontFamily: "sans-serif" }}>
      <div style={{ padding: "2.5rem", textAlign: "center", background: "white", borderRadius: "16px", border: "1px solid #e5e3dc", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", maxWidth: "400px" }}>
        <h2 style={{ color: "#0F2D52", margin: "0 0 0.5rem" }}>Entering Admin Portal...</h2>
        <p style={{ color: "#666", fontSize: "0.95rem", margin: 0 }}>Redirecting directly to the College Manager...</p>
      </div>
    </div>
  );
}
