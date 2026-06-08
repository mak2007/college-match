import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Clear the auth cookie
    cookieStore.set("cm_auth_token", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });

    const loginUrl = new URL("/admin/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    return NextResponse.redirect(loginUrl.toString(), 302);
  } catch (error: any) {
    console.error("Logout API Error:", error);
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}
