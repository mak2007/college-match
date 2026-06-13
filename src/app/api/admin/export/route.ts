import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/export?type=colleges|branches|scholarships|admission_pathways|all
 *
 * Exports database records as an XLSX file.
 * For "all", returns a multi-sheet workbook.
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    const wb = XLSX.utils.book_new();

    // ─── Colleges ───────────────────────────────────────
    if (type === "colleges" || type === "all") {
      const colleges = await prisma.college.findMany({ orderBy: { name: "asc" } });
      const rows = colleges.map((c) => {
        let meta: Record<string, any> = {};
        try { if (c.metadata) meta = JSON.parse(c.metadata); } catch {}
        return {
          name: c.name,
          state: c.state,
          city: c.city,
          officialApplyUrl: c.officialApplyUrl,
          website: c.website || "",
          placementScore: c.placementScore,
          collegeLifeScore: c.collegeLifeScore,
          curriculumScore: c.curriculumScore,
          isPartner: c.isPartner,
          isNewGen: c.isNewGen,
          commissionRate: c.commissionRate,
          nirf_ranking: meta.nirf_ranking ?? "",
          infra_rating: meta.infra_rating ?? "",
          startup_ecosystem: meta.startup_ecosystem ?? "",
          research_output: meta.research_output ?? "",
          international_exposure: meta.international_exposure ?? "",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Colleges");
    }

    // ─── Branches ───────────────────────────────────────
    if (type === "branches" || type === "all") {
      const branches = await prisma.collegeBranch.findMany({
        include: { college: true },
        orderBy: [{ college: { name: "asc" } }, { branchCode: "asc" }],
      });
      const rows = branches.map((b) => ({
        collegeName: b.college.name,
        branchCode: b.branchCode,
        branchName: b.branchName,
        tuitionFeeAnnual: b.tuitionFeeAnnual,
        hostelFeeAnnual: b.hostelFeeAnnual,
        seatCapacity: b.seatCapacity,
        avgSalary: b.avgSalary ?? "",
        medianSalary: b.medianSalary ?? "",
        highestSalary: b.highestSalary ?? "",
        minJeePercentileCutoff: b.minJeePercentileCutoff ?? "",
        minClass12Cutoff: b.minClass12Cutoff ?? "",
        branchStrengthScore: b.branchStrengthScore,
        placementPercentage: b.placementPercentage ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Branches");
    }

    // ─── Scholarships ───────────────────────────────────
    if (type === "scholarships" || type === "all") {
      const scholarships = await prisma.scholarship.findMany({
        include: { college: true },
        orderBy: [{ college: { name: "asc" } }, { name: "asc" }],
      });
      const rows = scholarships.map((s) => ({
        collegeName: s.college.name,
        name: s.name,
        amountType: s.amountType,
        amount: s.amount,
        description: s.description ?? "",
        isActive: s.isActive,
        criteria: s.criteria ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Scholarships");
    }

    // ─── Admission Pathways ─────────────────────────────
    if (type === "admission_pathways" || type === "all") {
      const pathways = await prisma.admissionPathway.findMany({
        include: { college: true },
        orderBy: [{ college: { name: "asc" } }, { branchCode: "asc" }],
      });
      const rows = pathways.map((p) => ({
        collegeName: p.college.name,
        branchCode: p.branchCode,
        admissionExam: p.admissionExam,
        equivalentJeePercentile: p.equivalentJeePercentile ?? "",
        admissionMode: p.admissionMode ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "AdmissionPathways");
    }

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="collegematch_export_${type}_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
