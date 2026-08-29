import { prisma } from "@/lib/db";
import styles from "./rankings.module.css";
import RankingsClient from "./RankingsClient";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  let colleges: any[] = [];
  try {
    colleges = await prisma.college.findMany({
      include: {
        branches: true,
      },
    });
  } catch (error) {
    console.error("RankingsPage fetch fallback:", error);
    colleges = [];
  }

  return (
    <div className={styles.wrapper}>
      <Navbar />

      {/* Rankings Workspace */}
      <RankingsClient initialColleges={colleges} />

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
