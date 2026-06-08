import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Aggregate commission stats by status
    const statusAggs = await prisma.commissionTransaction.groupBy({
      by: ["status"],
      _sum: { amountDue: true },
      _count: { id: true },
    });

    const statusBreakdown: Record<string, { count: number; amount: number }> = {
      PENDING: { count: 0, amount: 0 },
      INVOICED: { count: 0, amount: 0 },
      PAID: { count: 0, amount: 0 },
      CANCELLED: { count: 0, amount: 0 },
    };

    statusAggs.forEach((agg) => {
      statusBreakdown[agg.status] = {
        count: agg._count.id,
        amount: Number(agg._sum.amountDue || 0),
      };
    });

    const totalRevenue = statusBreakdown.PAID.amount;
    const pendingRevenue =
      statusBreakdown.PENDING.amount + statusBreakdown.INVOICED.amount;
    const totalTransactions = Object.values(statusBreakdown).reduce(
      (sum, s) => sum + s.count,
      0
    );

    // Recent transactions (last 5)
    const recentTransactions = await prisma.commissionTransaction.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        lead: {
          include: {
            student: { select: { name: true } },
            college: { select: { name: true } },
          },
        },
      },
    });

    // Top colleges by commission amount
    const allTransactions = await prisma.commissionTransaction.findMany({
      where: { status: { not: "CANCELLED" } },
      select: {
        amountDue: true,
        lead: {
          select: {
            college: { select: { id: true, name: true } },
          },
        },
      },
    });

    const collegeMap: Record<
      string,
      { name: string; totalAmount: number; leadCount: number }
    > = {};
    allTransactions.forEach((t) => {
      const cId = t.lead.college.id;
      if (!collegeMap[cId]) {
        collegeMap[cId] = {
          name: t.lead.college.name,
          totalAmount: 0,
          leadCount: 0,
        };
      }
      collegeMap[cId].totalAmount += Number(t.amountDue);
      collegeMap[cId].leadCount += 1;
    });

    const topColleges = Object.entries(collegeMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    return NextResponse.json({
      totalRevenue,
      pendingRevenue,
      totalTransactions,
      statusBreakdown,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        amountDue: Number(t.amountDue),
        status: t.status,
        createdAt: t.createdAt,
        studentName: t.lead.student.name,
        collegeName: t.lead.college.name,
      })),
      topColleges,
    });
  } catch (error: any) {
    console.error("Commission Summary Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
