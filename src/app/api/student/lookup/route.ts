import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { email: email.trim() },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found with this email" },
        { status: 404 }
      );
    }

    return NextResponse.json({ id: student.id });
  } catch (error: any) {
    console.error("Student Lookup API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
