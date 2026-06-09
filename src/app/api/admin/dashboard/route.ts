import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalLeads,
      partnerCollegesCount,
      transactions,
      recentLeads,
      partnerColleges,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.college.count({ where: { isPartner: true } }),
      prisma.commissionTransaction.findMany({
        select: { amountDue: true, status: true },
      }),
      prisma.lead.findMany({
        orderBy: { referredAt: "desc" },
        take: 10,
        include: { student: true, college: true, commissionTransaction: true },
      }),
      prisma.college.findMany({
        include: {
          leads: { include: { commissionTransaction: true } },
        },
      }),
    ]);

    const totalCommission = transactions.reduce(
      (acc, t) => acc + Number(t.amountDue),
      0
    );
    const pendingCommission = transactions
      .filter((t) => t.status === "PENDING" || t.status === "INVOICED")
      .reduce((acc, t) => acc + Number(t.amountDue), 0);
    const paidCommission = transactions
      .filter((t) => t.status === "PAID")
      .reduce((acc, t) => acc + Number(t.amountDue), 0);

    const collegesList = partnerColleges.map((c) => {
      const enrollments = c.leads.filter((l) => l.status === "ENROLLED");
      const totalRev = enrollments.reduce(
        (acc, l) =>
          acc + (l.commissionTransaction ? Number(l.commissionTransaction.amountDue) : 0),
        0
      );
      return {
        id: c.id,
        name: c.name,
        city: c.city,
        isPartner: c.isPartner,
        commissionRate: Number(c.commissionRate),
        leadsCount: c.leads.length,
        enrollmentsCount: enrollments.length,
        revenueEarned: totalRev,
      };
    });

    return NextResponse.json({
      stats: {
        totalLeads,
        partnerCollegesCount,
        totalCommission,
        pendingCommission,
        paidCommission,
      },
      recentLeads,
      collegesList,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
