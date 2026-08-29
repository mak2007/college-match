import { prisma } from "@/lib/db";
import styles from "./discovery.module.css";
import DiscoveryClient from "./DiscoveryClient";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

// Server Component: fetches data dynamically at request time with fallback
export default async function DiscoverPage() {
  let colleges: any[] = [];
  try {
    colleges = await prisma.college.findMany({
      include: {
        branches: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  } catch (error) {
    console.error("DiscoverPage build/fetch fallback:", error);
    colleges = [];
  }

  return (
    <div className={styles.wrapper}>
      <Navbar />

      {/* Discovery Workspace */}
      <DiscoveryClient initialColleges={colleges} />

      {/* Footer */}
      <footer className={styles.header} style={{ marginTop: "auto", borderTop: "1px solid var(--light-border)", borderBottom: "none", padding: "2rem 0" }}>
        <div className={styles.headerContainer} style={{ height: "auto" }}>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem" }}>© 2026 kollegio. All rights reserved.</p>
          <p style={{ color: "var(--light-text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>Data-backed college selection engine</p>
        </div>
      </footer>
    </div>
  );
}
