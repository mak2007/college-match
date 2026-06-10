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

export async function GET(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collegeId = searchParams.get("collegeId");

    const where = collegeId ? { collegeId } : {};
    const scholarships = await prisma.scholarship.findMany({
      where,
      include: { college: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(scholarships);
  } catch (error: any) {
    console.error("GET Scholarships Error:", error);
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
    const { collegeId, name, description, amountType, amount, criteria, isActive } = body;

    if (!collegeId || !name || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields: collegeId, name, amount" }, { status: 400 });
    }

    const scholarship = await prisma.scholarship.create({
      data: {
        collegeId,
        name,
        description: description || null,
        amountType: amountType || "FIXED",
        amount: parseFloat(amount) || 0,
        criteria: criteria ? JSON.stringify(criteria) : null,
        isActive: isActive !== false,
      },
      include: { college: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, scholarship }, { status: 201 });
  } catch (error: any) {
    console.error("POST Scholarship Error:", error);
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
    const { scholarshipId, name, description, amountType, amount, criteria, isActive } = body;

    if (!scholarshipId) {
      return NextResponse.json({ error: "Missing scholarshipId parameter" }, { status: 400 });
    }

    const updated = await prisma.scholarship.update({
      where: { id: scholarshipId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(amountType !== undefined && { amountType }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(criteria !== undefined && { criteria: criteria ? JSON.stringify(criteria) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: { college: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, scholarship: updated });
  } catch (error: any) {
    console.error("PATCH Scholarship Error:", error);
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
    const scholarshipId = searchParams.get("scholarshipId");

    if (!scholarshipId) {
      return NextResponse.json({ error: "Missing scholarshipId parameter" }, { status: 400 });
    }

    await prisma.scholarship.delete({ where: { id: scholarshipId } });

    return NextResponse.json({ success: true, message: "Scholarship deleted" });
  } catch (error: any) {
    console.error("DELETE Scholarship Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
