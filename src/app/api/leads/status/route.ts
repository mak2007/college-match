import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing 'token' query parameter" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { trackingToken: token },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        college: {
          select: { id: true, name: true, city: true, state: true },
        },
        commissionTransaction: {
          select: { id: true, amountDue: true, status: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found for the provided tracking token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      leadId: lead.id,
      status: lead.status,
      trackingToken: lead.trackingToken,
      branchCode: lead.branchCode,
      referredAt: lead.referredAt,
      statusUpdatedAt: lead.statusUpdatedAt,
      student: lead.student,
      college: lead.college,
      commission: lead.commissionTransaction
        ? {
            id: lead.commissionTransaction.id,
            amountDue: Number(lead.commissionTransaction.amountDue),
            status: lead.commissionTransaction.status,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Lead Status Lookup Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
