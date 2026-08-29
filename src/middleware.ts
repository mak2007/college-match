import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge Middleware: Open access to allow seamless admin management without requiring login each time
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
