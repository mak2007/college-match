import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const defaultPasswordHash = await bcrypt.hash("Passwordless_Session_2026", 10);

    // Find or auto-create user for instant passwordless login
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
        collegeAdminProfile: {
          select: { collegeId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      // Auto-register user & student profile if first time
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: defaultPasswordHash,
          role: "STUDENT",
        },
        select: {
          id: true,
          email: true,
          role: true,
          collegeAdminProfile: {
            select: { collegeId: true },
            take: 1,
          },
        },
      });

      await prisma.student.upsert({
        where: { email: normalizedEmail },
        update: { name: name || normalizedEmail.split("@")[0] },
        create: {
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
        },
      });
    }

    const collegeId =
      user.role === "COLLEGE_ADMIN" && user.collegeAdminProfile.length > 0
        ? user.collegeAdminProfile[0].collegeId
        : null;

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId,
    });

    const cookieStore = await cookies();
    cookieStore.set("cm_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days session
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      role: user.role,
      email: user.email,
      collegeId,
    });
  } catch (error: any) {
    console.error("Login API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
