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

export async function GET() {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const colleges = await prisma.college.findMany({
      include: {
        branches: true,
      },
    });

    return NextResponse.json(colleges);
  } catch (error: any) {
    console.error("GET Colleges Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { collegeId, name, state, city, commissionRate, placementScore, collegeLifeScore, curriculumScore, metadata } = body;

    if (!collegeId) {
      return NextResponse.json({ error: "Missing collegeId parameter" }, { status: 400 });
    }

    // Update the college record
    const updated = await prisma.college.update({
      where: { id: collegeId },
      data: {
        name,
        state,
        city,
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
        placementScore: placementScore ? parseFloat(placementScore) : undefined,
        collegeLifeScore: collegeLifeScore ? parseFloat(collegeLifeScore) : undefined,
        curriculumScore: curriculumScore ? parseFloat(curriculumScore) : undefined,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return NextResponse.json({ success: true, college: updated });
  } catch (error: any) {
    console.error("PATCH College Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
