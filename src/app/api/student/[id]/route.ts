import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        locations: true,
        priorities: {
          orderBy: { rankOrder: "asc" },
        },
        recommendations: {
          orderBy: { rankPosition: "asc" },
          take: 10,
          include: {
            college: {
              include: { branches: true },
            },
          },
        },
        leads: {
          orderBy: { referredAt: "desc" },
          include: {
            college: true,
            commissionTransaction: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Compute quick stats
    const topMatch = student.recommendations[0];
    const avgMatchScore =
      student.recommendations.length > 0
        ? student.recommendations.reduce((s, r) => s + Number(r.matchScore), 0) /
          student.recommendations.length
        : 0;

    const leadStatusCounts = student.leads.reduce(
      (acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        jeePercentile: student.jeePercentile,
        class12Percentage: student.class12Percentage,
        budgetLimit: student.budgetLimit,
        isBudgetConstraint: student.isBudgetConstraint,
        restrictLocation: student.restrictLocation,
        createdAt: student.createdAt,
        locations: student.locations,
        priorities: student.priorities,
      },
      stats: {
        totalRecommendations: student.recommendations.length,
        topMatchScore: topMatch ? Number(topMatch.matchScore) : 0,
        topCollegeName: topMatch ? topMatch.college.name : null,
        avgMatchScore: Math.round(avgMatchScore * 10) / 10,
        totalLeads: student.leads.length,
        leadStatusCounts,
      },
      recommendations: student.recommendations.map((rec) => {
        const branch = rec.college.branches.find(
          (b) => b.branchCode === rec.branchCode
        );
        let keyReasons: string[] = [];
        try {
          keyReasons = JSON.parse(rec.reasons as string);
        } catch {
          keyReasons = [String(rec.reasons)];
        }
        return {
          id: rec.id,
          rankPosition: rec.rankPosition,
          matchScore: Number(rec.matchScore),
          collegeName: rec.college.name,
          collegeId: rec.college.id,
          collegeCity: rec.college.city,
          collegeState: rec.college.state,
          isPartner: rec.college.isPartner,
          officialApplyUrl: rec.college.officialApplyUrl,
          branchCode: rec.branchCode,
          branchName: branch?.branchName ?? rec.branchCode,
          annualTuition: branch ? Number(branch.tuitionFeeAnnual) : null,
          annualHostel: branch ? Number(branch.hostelFeeAnnual) : null,
          total4YrCost: branch
            ? (Number(branch.tuitionFeeAnnual) + Number(branch.hostelFeeAnnual)) * 4
            : null,
          avgSalary: branch?.avgSalary ? Number(branch.avgSalary) : null,
          keyReasons,
          createdAt: rec.createdAt,
        };
      }),
      leads: student.leads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        collegeId: lead.collegeId,
        collegeName: lead.college.name,
        collegeCity: lead.college.city,
        collegeState: lead.college.state,
        branchCode: lead.branchCode,
        trackingToken: lead.trackingToken,
        referredAt: lead.referredAt,
        statusUpdatedAt: lead.statusUpdatedAt,
      })),
    });
  } catch (error: any) {
    console.error("Student API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
