import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User record
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "STUDENT",
      },
    });

    // Create Student profile
    await prisma.student.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        phone: phone || `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
      },
    });

    // Sign JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: null,
    };

    const token = await signToken(tokenPayload);

    // Set HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("cm_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      email: user.email,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Register API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
