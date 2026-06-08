import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (search.trim()) {
      where.OR = [
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { email: { contains: search, mode: "insensitive" } } },
        { college: { name: { contains: search, mode: "insensitive" } } },
        { trackingToken: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { referredAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              jeePercentile: true,
              class12Percentage: true,
            },
          },
          college: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              commissionRate: true,
            },
          },
          commissionTransaction: {
            select: {
              id: true,
              amountDue: true,
              status: true,
              invoiceDate: true,
              paymentDate: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    // Aggregate status counts
    const statusCounts = await prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusBreakdown: Record<string, number> = {};
    statusCounts.forEach((sc) => {
      statusBreakdown[sc.status] = sc._count.id;
    });

    return NextResponse.json({
      leads: leads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        branchCode: lead.branchCode,
        trackingToken: lead.trackingToken,
        referredAt: lead.referredAt,
        statusUpdatedAt: lead.statusUpdatedAt,
        student: {
          id: lead.student.id,
          name: lead.student.name,
          email: lead.student.email,
          phone: lead.student.phone,
          jeePercentile: lead.student.jeePercentile
            ? Number(lead.student.jeePercentile)
            : null,
          class12Percentage: lead.student.class12Percentage
            ? Number(lead.student.class12Percentage)
            : null,
        },
        college: {
          id: lead.college.id,
          name: lead.college.name,
          city: lead.college.city,
          state: lead.college.state,
          commissionRate: Number(lead.college.commissionRate),
        },
        commission: lead.commissionTransaction
          ? {
              id: lead.commissionTransaction.id,
              amountDue: Number(lead.commissionTransaction.amountDue),
              status: lead.commissionTransaction.status,
              invoiceDate: lead.commissionTransaction.invoiceDate,
              paymentDate: lead.commissionTransaction.paymentDate,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statusBreakdown,
    });
  } catch (error: any) {
    console.error("Leads History API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
