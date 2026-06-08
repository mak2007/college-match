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

    const totalColleges = await prisma.college.count();
    const totalStudents = await prisma.student.count();
    const totalLeads = await prisma.lead.count();

    const enrolledLeads = await prisma.lead.findMany({
      where: { status: "ENROLLED" },
      include: {
        college: true,
        commissionTransaction: true,
      },
    });

    const enrolledCount = enrolledLeads.length;
    const totalCommissionAccrued = enrolledLeads.reduce((sum, lead) => {
      const amount = lead.commissionTransaction?.amountDue ?? lead.college.commissionRate ?? 20000;
      return sum + Number(amount);
    }, 0);

    return NextResponse.json({
      totalColleges,
      totalStudents,
      totalLeads,
      enrolledCount,
      totalCommissionAccrued,
    });
  } catch (error: any) {
    console.error("GET Superadmin Metrics Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
