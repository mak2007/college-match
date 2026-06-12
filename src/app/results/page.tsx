import { prisma } from "@/lib/db";
import Link from "next/link";
import ResultsClient from "./ResultsClient";

interface ResultsProps {
  searchParams: Promise<{ student_id?: string }>;
}

export default async function ResultsPage({ searchParams }: ResultsProps) {
  const params = await searchParams;
  const studentId = params.student_id;

  if (!studentId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFAF0" }}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>No recommendations found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            It looks like you haven&apos;t filled out the preference wizard yet.
          </p>
          <Link href="/wizard" className="btn btn-primary">
            Start Preference Wizard
          </Link>
        </div>
      </div>
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      locations: true,
      priorities: true,
    },
  });

  if (!student) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFAF0" }}>
        <div style={{ maxWidth: "500px", background: "white", border: "1px solid #e6e4dc", borderRadius: "16px", padding: "2.5rem", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
          <h2 style={{ color: "#0F2D52" }}>Student record not found</h2>
          <p style={{ color: "#4a4a4a", margin: "1rem 0" }}>
            The student ID provided is invalid or has been removed.
          </p>
          <Link href="/wizard" className="btn btn-primary">
            Restart Wizard
          </Link>
        </div>
      </div>
    );
  }

  const dbRecommendations = await prisma.recommendation.findMany({
    where: { studentId },
    orderBy: { rankPosition: "asc" },
    include: {
      college: {
        include: {
          branches: true,
        },
      },
    },
  });

  return (
    <ResultsClient
      student={{
        id: student.id,
        name: student.name,
        jeePercentile: student.jeePercentile,
        class12Percentage: student.class12Percentage,
        budgetLimit: student.budgetLimit,
      }}
      recommendations={dbRecommendations as any}
    />
  );
}
