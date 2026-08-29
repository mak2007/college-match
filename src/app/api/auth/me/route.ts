import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        collegeId: payload.collegeId,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
