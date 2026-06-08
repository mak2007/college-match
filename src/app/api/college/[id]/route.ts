import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch College profile and branches
    const college = await prisma.college.findUnique({
      where: { id },
      include: {
        branches: {
          orderBy: { branchCode: "asc" },
        },
      },
    });

    if (!college) {
      return NextResponse.json({ error: "College profile not found" }, { status: 404 });
    }

    // 2. Fetch Leads with Student details
    const leads = await prisma.lead.findMany({
      where: { collegeId: id },
      orderBy: { referredAt: "desc" },
      include: {
        student: true,
        commissionTransaction: true,
      },
    });

    // 3. Aggregate stats
    const totalLeads = leads.length;
    const enrolledLeads = leads.filter((l) => l.status === "ENROLLED");
    const enrolledCount = enrolledLeads.length;
    const totalCommissionsDue = enrolledLeads.reduce((sum, lead) => {
      const transAmount = lead.commissionTransaction?.amountDue ?? college.commissionRate ?? 20000;
      return sum + Number(transAmount);
    }, 0);

    const leadStatusCounts = leads.reduce((acc: Record<string, number>, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    // Parse custom metadata attributes if present
    let customAttributes: Record<string, any> = {};
    try {
      if (college.metadata) {
        customAttributes = JSON.parse(college.metadata);
      }
    } catch (e) {
      console.warn("Could not parse college metadata:", e);
    }

    return NextResponse.json({
      college: {
        id: college.id,
        name: college.name,
        slug: college.slug,
        state: college.state,
        city: college.city,
        logoUrl: college.logoUrl,
        coverImageUrl: college.coverImageUrl,
        brochureUrl: college.brochureUrl,
        officialApplyUrl: college.officialApplyUrl,
        isPartner: college.isPartner,
        commissionRate: Number(college.commissionRate),
        placementScore: college.placementScore,
        collegeLifeScore: college.collegeLifeScore,
        curriculumScore: college.curriculumScore,
        customAttributes,
        createdAt: college.createdAt,
      },
      branches: college.branches.map((b) => {
        let branchMeta = {};
        try {
          if (b.metadata) branchMeta = JSON.parse(b.metadata);
        } catch {}
        return {
          id: b.id,
          branchName: b.branchName,
          branchCode: b.branchCode,
          tuitionFeeAnnual: Number(b.tuitionFeeAnnual),
          hostelFeeAnnual: Number(b.hostelFeeAnnual),
          seatCapacity: b.seatCapacity,
          avgSalary: b.avgSalary ? Number(b.avgSalary) : null,
          highestSalary: b.highestSalary ? Number(b.highestSalary) : null,
          minJeePercentileCutoff: b.minJeePercentileCutoff ? Number(b.minJeePercentileCutoff) : null,
          minClass12Cutoff: b.minClass12Cutoff ? Number(b.minClass12Cutoff) : null,
          branchStrengthScore: b.branchStrengthScore,
          metadata: branchMeta,
        };
      }),
      stats: {
        totalLeads,
        enrolledCount,
        totalCommissionsDue,
        leadStatusCounts,
      },
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
          jeePercentile: lead.student.jeePercentile ? Number(lead.student.jeePercentile) : null,
          class12Percentage: lead.student.class12Percentage ? Number(lead.student.class12Percentage) : null,
        },
        commission: lead.commissionTransaction ? {
          id: lead.commissionTransaction.id,
          amountDue: Number(lead.commissionTransaction.amountDue),
          status: lead.commissionTransaction.status,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error("College Admin API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
