import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const status = searchParams.get("status") || "ALL";

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status !== "ALL") {
      where.status = status.toUpperCase();
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.commissionTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            include: {
              student: {
                select: { id: true, name: true, email: true },
              },
              college: {
                select: { id: true, name: true, city: true, state: true },
              },
            },
          },
        },
      }),
      prisma.commissionTransaction.count({ where }),
    ]);

    // Aggregate summary by status
    const statusAggs = await prisma.commissionTransaction.groupBy({
      by: ["status"],
      _sum: { amountDue: true },
      _count: { id: true },
    });

    const summary: Record<string, { count: number; amount: number }> = {
      PENDING: { count: 0, amount: 0 },
      INVOICED: { count: 0, amount: 0 },
      PAID: { count: 0, amount: 0 },
      CANCELLED: { count: 0, amount: 0 },
    };

    statusAggs.forEach((agg) => {
      summary[agg.status] = {
        count: agg._count.id,
        amount: Number(agg._sum.amountDue || 0),
      };
    });

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        amountDue: Number(t.amountDue),
        status: t.status,
        invoiceDate: t.invoiceDate,
        paymentDate: t.paymentDate,
        createdAt: t.createdAt,
        lead: {
          id: t.lead.id,
          trackingToken: t.lead.trackingToken,
          branchCode: t.lead.branchCode,
          status: t.lead.status,
          student: t.lead.student,
          college: t.lead.college,
        },
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary,
    });
  } catch (error: any) {
    console.error("Commission GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { commissionId, status, invoiceDate, paymentDate } = body;

    const VALID_STATUSES = ["PENDING", "INVOICED", "PAID", "CANCELLED"];

    if (!commissionId || !status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid params. Status must be: " + VALID_STATUSES.join(", ") },
        { status: 400 }
      );
    }

    const existing = await prisma.commissionTransaction.findUnique({
      where: { id: commissionId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Commission not found" }, { status: 404 });
    }

    const uppercaseStatus = status.toUpperCase();
    const updateData: any = { status: uppercaseStatus };

    // Auto-set invoiceDate on INVOICED
    if (uppercaseStatus === "INVOICED" && !existing.invoiceDate) {
      updateData.invoiceDate = invoiceDate ? new Date(invoiceDate) : new Date();
    }

    // Auto-set paymentDate on PAID
    if (uppercaseStatus === "PAID" && !existing.paymentDate) {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    }

    const updated = await prisma.commissionTransaction.update({
      where: { id: commissionId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      commission: {
        id: updated.id,
        amountDue: Number(updated.amountDue),
        status: updated.status,
        invoiceDate: updated.invoiceDate,
        paymentDate: updated.paymentDate,
      },
    });
  } catch (error: any) {
    console.error("Commission PATCH Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
