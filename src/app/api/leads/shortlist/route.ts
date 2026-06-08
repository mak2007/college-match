import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, collegeId, branchCode } = body;

    if (!studentId || !collegeId || !branchCode) {
      return NextResponse.json(
        { error: "Missing studentId, collegeId, or branchCode in request body" },
        { status: 400 }
      );
    }

    // 1. Check if the lead already exists for this student, college, and branch
    const existingLead = await prisma.lead.findFirst({
      where: {
        studentId,
        collegeId,
        branchCode,
      },
    });

    if (existingLead) {
      // If the status is not already shortlisted or enrolled, update to SHORTLISTED
      if (existingLead.status !== "SHORTLISTED" && existingLead.status !== "ENROLLED") {
        const updatedLead = await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            status: "SHORTLISTED",
          },
        });
        return NextResponse.json({
          success: true,
          message: "Lead status updated to SHORTLISTED",
          leadId: updatedLead.id,
          status: updatedLead.status,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Lead already exists with status: " + existingLead.status,
        leadId: existingLead.id,
        status: existingLead.status,
      });
    }

    // 2. Generate a secure unique tracking token
    const trackingToken = `cm_sl_${randomBytes(16).toString("hex")}`;

    // 3. Create a lead in the database with status SHORTLISTED
    const newLead = await prisma.lead.create({
      data: {
        studentId,
        collegeId,
        branchCode,
        status: "SHORTLISTED",
        trackingToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "College successfully added to shortlist",
      leadId: newLead.id,
      status: newLead.status,
    });
  } catch (error: any) {
    console.error("Shortlist Lead API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
