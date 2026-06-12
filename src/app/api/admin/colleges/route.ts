import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;
  if (!token) return false;
  const decoded = await verifyToken(token);
  return decoded !== null && decoded.role === "SUPERADMIN";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const colleges = await prisma.college.findMany({
      include: { branches: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(colleges);
  } catch (error: any) {
    console.error("GET Colleges Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
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
      name, state, city, officialApplyUrl, website,
      logoUrl, coverImageUrl, brochureUrl,
      isPartner, isNewGen, commissionRate,
      placementScore, collegeLifeScore, curriculumScore,
      metadata, branches,
    } = body;

    if (!name || !state || !city || !officialApplyUrl) {
      return NextResponse.json({ error: "Missing required fields: name, state, city, officialApplyUrl" }, { status: 400 });
    }

    const slug = slugify(name);

    const existing = await prisma.college.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A college with this name already exists" }, { status: 409 });
    }

    const college = await prisma.college.create({
      data: {
        name,
        slug,
        state,
        city,
        officialApplyUrl,
        website: website || null,
        logoUrl: logoUrl || null,
        coverImageUrl: coverImageUrl || null,
        brochureUrl: brochureUrl || null,
        isPartner: Boolean(isPartner),
        isNewGen: Boolean(isNewGen),
        commissionRate: parseFloat(commissionRate) || 0,
        placementScore: parseFloat(placementScore) || 0,
        collegeLifeScore: parseFloat(collegeLifeScore) || 0,
        curriculumScore: parseFloat(curriculumScore) || 0,
        metadata: metadata ? JSON.stringify(metadata) : null,
        branches: branches && branches.length > 0
          ? {
              create: branches.map((b: any) => ({
                branchName: b.branchName,
                branchCode: b.branchCode,
                tuitionFeeAnnual: parseFloat(b.tuitionFeeAnnual) || 0,
                hostelFeeAnnual: parseFloat(b.hostelFeeAnnual) || 0,
                seatCapacity: parseInt(b.seatCapacity) || 0,
                avgSalary: b.avgSalary ? parseFloat(b.avgSalary) : null,
                medianSalary: b.medianSalary ? parseFloat(b.medianSalary) : null,
                highestSalary: b.highestSalary ? parseFloat(b.highestSalary) : null,
                minJeePercentileCutoff: b.minJeePercentileCutoff ? parseFloat(b.minJeePercentileCutoff) : null,
                minClass12Cutoff: b.minClass12Cutoff ? parseFloat(b.minClass12Cutoff) : null,
                branchStrengthScore: parseFloat(b.branchStrengthScore) || 0,
                placementPercentage: b.placementPercentage ? parseFloat(b.placementPercentage) : null,
                metadata: b.metadata ? JSON.stringify(b.metadata) : null,
              })),
            }
          : undefined,
      },
      include: { branches: true },
    });

    return NextResponse.json({ success: true, college }, { status: 201 });
  } catch (error: any) {
    console.error("POST College Error:", error);
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
    const { collegeId, name, state, city, officialApplyUrl, website, logoUrl, coverImageUrl, brochureUrl, isPartner, isNewGen, commissionRate, placementScore, collegeLifeScore, curriculumScore, metadata } = body;

    if (!collegeId) {
      return NextResponse.json({ error: "Missing collegeId parameter" }, { status: 400 });
    }

    const updated = await prisma.college.update({
      where: { id: collegeId },
      data: {
        ...(name !== undefined && { name }),
        ...(state !== undefined && { state }),
        ...(city !== undefined && { city }),
        ...(officialApplyUrl !== undefined && { officialApplyUrl }),
        ...(website !== undefined && { website }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(brochureUrl !== undefined && { brochureUrl }),
        ...(isPartner !== undefined && { isPartner: Boolean(isPartner) }),
        ...(isNewGen !== undefined && { isNewGen: Boolean(isNewGen) }),
        ...(commissionRate !== undefined && { commissionRate: parseFloat(commissionRate) }),
        ...(placementScore !== undefined && { placementScore: parseFloat(placementScore) }),
        ...(collegeLifeScore !== undefined && { collegeLifeScore: parseFloat(collegeLifeScore) }),
        ...(curriculumScore !== undefined && { curriculumScore: parseFloat(curriculumScore) }),
        ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
      },
      include: { branches: true },
    });

    return NextResponse.json({ success: true, college: updated });
  } catch (error: any) {
    console.error("PATCH College Error:", error);
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
    const collegeId = searchParams.get("collegeId");

    if (!collegeId) {
      return NextResponse.json({ error: "Missing collegeId parameter" }, { status: 400 });
    }

    await prisma.college.delete({ where: { id: collegeId } });

    return NextResponse.json({ success: true, message: "College deleted" });
  } catch (error: any) {
    console.error("DELETE College Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
