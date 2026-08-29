import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

async function verifySuperadmin() {
  return true;
}

export async function GET(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get("collegeId");

    const where = collegeId ? { collegeId } : {};
    const branches = await prisma.collegeBranch.findMany({
      where,
      include: { college: { select: { id: true, name: true } } },
      orderBy: { branchName: "asc" },
    });

    return NextResponse.json(branches);
  } catch (error: any) {
    console.error("GET Branches Error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const {
      collegeId, branchName, branchCode,
      tuitionFeeAnnual, hostelFeeAnnual, seatCapacity,
      avgSalary, medianSalary, highestSalary,
      minJeePercentileCutoff, minClass12Cutoff,
      branchStrengthScore, placementPercentage, metadata,
    } = body;

    if (!collegeId || !branchName || !branchCode) {
      return NextResponse.json({ error: "Missing required fields: collegeId, branchName, branchCode" }, { status: 400 });
    }

    const existing = await prisma.collegeBranch.findUnique({
      where: { collegeId_branchCode: { collegeId, branchCode: branchCode.toUpperCase() } },
    });
    if (existing) {
      return NextResponse.json({ error: `Branch ${branchCode} already exists for this college` }, { status: 409 });
    }

    const branch = await prisma.collegeBranch.create({
      data: {
        collegeId,
        branchName,
        branchCode: branchCode.toUpperCase(),
        tuitionFeeAnnual: parseFloat(tuitionFeeAnnual) || 0,
        hostelFeeAnnual: parseFloat(hostelFeeAnnual) || 0,
        seatCapacity: parseInt(seatCapacity) || 0,
        avgSalary: avgSalary ? parseFloat(avgSalary) : null,
        medianSalary: medianSalary ? parseFloat(medianSalary) : null,
        highestSalary: highestSalary ? parseFloat(highestSalary) : null,
        minJeePercentileCutoff: minJeePercentileCutoff ? parseFloat(minJeePercentileCutoff) : null,
        minClass12Cutoff: minClass12Cutoff ? parseFloat(minClass12Cutoff) : null,
        branchStrengthScore: parseFloat(branchStrengthScore) || 0,
        placementPercentage: placementPercentage ? parseFloat(placementPercentage) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: { college: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (error: any) {
    console.error("POST Branch Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const {
      branchId, branchName, branchCode,
      tuitionFeeAnnual, hostelFeeAnnual, seatCapacity,
      avgSalary, medianSalary, highestSalary,
      minJeePercentileCutoff, minClass12Cutoff,
      branchStrengthScore, placementPercentage, metadata,
    } = body;

    if (!branchId) {
      return NextResponse.json({ error: "Missing branchId parameter" }, { status: 400 });
    }

    const updated = await prisma.collegeBranch.update({
      where: { id: branchId },
      data: {
        ...(branchName !== undefined && { branchName }),
        ...(branchCode !== undefined && { branchCode: branchCode.toUpperCase() }),
        ...(tuitionFeeAnnual !== undefined && { tuitionFeeAnnual: parseFloat(tuitionFeeAnnual) }),
        ...(hostelFeeAnnual !== undefined && { hostelFeeAnnual: parseFloat(hostelFeeAnnual) }),
        ...(seatCapacity !== undefined && { seatCapacity: parseInt(seatCapacity) }),
        ...(avgSalary !== undefined && { avgSalary: avgSalary ? parseFloat(avgSalary) : null }),
        ...(medianSalary !== undefined && { medianSalary: medianSalary ? parseFloat(medianSalary) : null }),
        ...(highestSalary !== undefined && { highestSalary: highestSalary ? parseFloat(highestSalary) : null }),
        ...(minJeePercentileCutoff !== undefined && { minJeePercentileCutoff: minJeePercentileCutoff ? parseFloat(minJeePercentileCutoff) : null }),
        ...(minClass12Cutoff !== undefined && { minClass12Cutoff: minClass12Cutoff ? parseFloat(minClass12Cutoff) : null }),
        ...(branchStrengthScore !== undefined && { branchStrengthScore: parseFloat(branchStrengthScore) }),
        ...(placementPercentage !== undefined && { placementPercentage: placementPercentage ? parseFloat(placementPercentage) : null }),
        ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
      },
      include: { college: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    console.error("PATCH Branch Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json({ error: "Missing branchId parameter" }, { status: 400 });
    }

    await prisma.collegeBranch.delete({ where: { id: branchId } });

    return NextResponse.json({ success: true, message: "Branch deleted" });
  } catch (error: any) {
    console.error("DELETE Branch Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
