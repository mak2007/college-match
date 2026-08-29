"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/super");
  }, [router]);
  return <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>Redirecting to College Manager...</div>;
}

export default function CollegeFormPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <RedirectContent />
    </Suspense>
  );
}
