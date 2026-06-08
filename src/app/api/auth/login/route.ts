import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me_12345";

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

    // 1. Find User by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        collegeAdminProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Verify password hash
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. For College Admins, get the associated college ID
    let collegeId: string | null = null;
    if (user.role === "COLLEGE_ADMIN" && user.collegeAdminProfile.length > 0) {
      collegeId = user.collegeAdminProfile[0].collegeId;
    }

    // 4. Sign JWT Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      collegeId: collegeId,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

    // 5. Set HttpOnly Cookie
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
      college_id: collegeId,
    });
  } catch (error: any) {
    console.error("Login API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
