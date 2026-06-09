import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's basic info from the JWT cookie,
 * or a 401 response if not authenticated.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        collegeId: payload.collegeId,
      },
    });
  } catch (error: any) {
    console.error("Auth /me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
