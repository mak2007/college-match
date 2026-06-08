import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, code, name, phone } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and OTP code are required" }, { status: 400 });
    }

    const key = `otp:${email.trim().toLowerCase()}`;
    const otpConfig = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!otpConfig || otpConfig.value !== code.trim()) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Delete the OTP after successful verification
    await prisma.systemConfig.delete({ where: { key } }).catch(() => {});

    // 1. Find or Create User model with STUDENT role
    let user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Create a student user. Let's hash a random placeholder password
      user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash: "$2a$10$UnusedPlaceholderPasswordHashForOTPLoginOnly",
          role: "STUDENT",
        },
      });
    }

    // 2. Ensure Student profile exists as well
    let student = await prisma.student.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          email: email.trim().toLowerCase(),
          name: name || email.split("@")[0],
          phone: phone || `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
        },
      });
    }

    // 3. Sign JWT Session token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: null,
    };

    const token = await signToken(tokenPayload);

    // 4. Set cookie
    const cookieStore = await cookies();
    cookieStore.set("cm_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "strict",
      path: "/",
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      email: user.email,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
