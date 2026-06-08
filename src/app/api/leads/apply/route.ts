import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

// GET: Legacy redirect-based apply flow (backward compatible)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const collegeId = searchParams.get("college_id");
    const branchCode = searchParams.get("branch_code");

    if (!studentId || !collegeId || !branchCode) {
      return new Response("Missing student_id, college_id, or branch_code parameters", {
        status: 400,
      });
    }

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      return new Response("Target college not found", { status: 404 });
    }

    // Check for existing lead
    const existingLead = await prisma.lead.findFirst({
      where: { studentId, collegeId, branchCode },
    });

    let trackingToken: string;

    if (existingLead) {
      trackingToken = existingLead.trackingToken;
      // Update status to APPLIED if it was only REFERRED or SHORTLISTED
      if (existingLead.status === "REFERRED" || existingLead.status === "SHORTLISTED") {
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: { status: "APPLIED" },
        });
      }
    } else {
      trackingToken = `cm_${randomBytes(16).toString("hex")}`;
      await prisma.lead.create({
        data: {
          studentId,
          collegeId,
          branchCode,
          status: "REFERRED",
          trackingToken,
        },
      });
    }

    const redirectUrl = new URL(college.officialApplyUrl);
    redirectUrl.searchParams.set("utm_source", "collegematch");
    redirectUrl.searchParams.set("utm_medium", "referral");
    redirectUrl.searchParams.set("cm_token", trackingToken);

    return NextResponse.redirect(redirectUrl.toString(), 302);
  } catch (error: any) {
    console.error("Apply Lead GET Error:", error);
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// POST: AJAX-based apply flow for Student Dashboard
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

    // Check for existing lead
    const existingLead = await prisma.lead.findFirst({
      where: { studentId, collegeId, branchCode },
    });

    if (existingLead) {
      // If already ENROLLED or terminal, don't modify
      if (existingLead.status === "ENROLLED") {
        return NextResponse.json({
          success: true,
          message: "Already enrolled at this college",
          leadId: existingLead.id,
          trackingToken: existingLead.trackingToken,
          status: existingLead.status,
          isNew: false,
        });
      }

      // If REJECTED or LAPSED, re-activate as new REFERRED
      if (existingLead.status === "REJECTED" || existingLead.status === "LAPSED") {
        const updated = await prisma.lead.update({
          where: { id: existingLead.id },
          data: { status: "REFERRED" },
        });
        return NextResponse.json({
          success: true,
          message: "Lead re-activated as REFERRED",
          leadId: updated.id,
          trackingToken: updated.trackingToken,
          status: updated.status,
          isNew: false,
        });
      }

      // If REFERRED or SHORTLISTED, upgrade to APPLIED
      if (existingLead.status === "REFERRED" || existingLead.status === "SHORTLISTED") {
        const updated = await prisma.lead.update({
          where: { id: existingLead.id },
          data: { status: "APPLIED" },
        });
        return NextResponse.json({
          success: true,
          message: "Lead status upgraded to APPLIED",
          leadId: updated.id,
          trackingToken: updated.trackingToken,
          status: updated.status,
          isNew: false,
        });
      }

      // Already APPLIED
      return NextResponse.json({
        success: true,
        message: "Application already submitted",
        leadId: existingLead.id,
        trackingToken: existingLead.trackingToken,
        status: existingLead.status,
        isNew: false,
      });
    }

    // Create new lead
    const trackingToken = `cm_${randomBytes(16).toString("hex")}`;
    const newLead = await prisma.lead.create({
      data: {
        studentId,
        collegeId,
        branchCode,
        status: "REFERRED",
        trackingToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully! Lead created.",
      leadId: newLead.id,
      trackingToken: newLead.trackingToken,
      status: newLead.status,
      isNew: true,
    });
  } catch (error: any) {
    console.error("Apply Lead POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
