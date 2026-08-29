import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const colleges = await prisma.college.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        isPartner: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(colleges);
  } catch (error: any) {
    console.error("Colleges List API Error:", error);
    return NextResponse.json([]);
  }
}
