import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user and verify password in minimal queries
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        collegeAdminProfile: {
          select: { collegeId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
      maxAge: 60 * 60 * 24,
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
