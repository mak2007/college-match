import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { leadId, status } = body;

    const VALID_STATUSES = ["REFERRED", "APPLIED", "SHORTLISTED", "ENROLLED", "REJECTED", "LAPSED"];

    if (!leadId || !status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid parameters. status must be one of: " + VALID_STATUSES.join(", ") },
        { status: 400 }
      );
    }

    // 1. Fetch current Lead and join College
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        college: true,
        commissionTransaction: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const uppercaseStatus = status.toUpperCase();

    // 2. Update Lead Status
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: uppercaseStatus,
      },
    });

    // 3. Handle Commission generation if state transitions to ENROLLED
    if (uppercaseStatus === "ENROLLED" && lead.status !== "ENROLLED") {
      // Avoid duplicate transaction generation
      if (!lead.commissionTransaction) {
        const commissionAmount = lead.college.commissionRate || 20000; // Default fallback to 20k

        await prisma.commissionTransaction.create({
          data: {
            leadId: lead.id,
            amountDue: commissionAmount,
            status: "PENDING",
          },
        });
        console.log(`Commission transaction created for Lead ${lead.id} of amount ₹${commissionAmount}`);
      }
    }

    return NextResponse.json({
      success: true,
      lead_id: updatedLead.id,
      status: updatedLead.status,
      updated_at: updatedLead.statusUpdatedAt,
    });
  } catch (error: any) {
    console.error("Lead Patch Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
