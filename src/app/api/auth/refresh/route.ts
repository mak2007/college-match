import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, signToken } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Sign a new token with same payload
    const newToken = await signToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      collegeId: payload.collegeId,
    });

    cookieStore.set("cm_auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
