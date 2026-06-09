import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// ============================================================
// CollegeMatch Edge Middleware — Route Protection Layer
// ============================================================
// Runs on the Vercel Edge Runtime (or locally via Next.js dev).
// Validates the `cm_auth_token` JWT cookie before granting
// access to protected `/admin` and `/dashboard` routes.
// Uses `jose` via the unified auth library.
// ============================================================

// Routes that require authentication
const PROTECTED_PREFIXES = ["/admin", "/dashboard"];

// Routes within protected prefixes that should remain public
const PUBLIC_EXCEPTIONS = [
  "/admin/login", // Login page itself must be accessible
  "/api/auth",    // Auth API routes (login, logout, etc.)
];

// Role-based access control map
const ROLE_REQUIREMENTS: Record<string, string[]> = {
  "/admin/super":   ["SUPERADMIN"],
  "/admin/college": ["COLLEGE_ADMIN", "SUPERADMIN"],
  "/dashboard/student": ["STUDENT", "ADMIN", "SUPERADMIN"],
  "/dashboard/college": ["COLLEGE_ADMIN", "ADMIN", "SUPERADMIN"],
};

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  collegeId: string | null;
  exp?: number;
  iat?: number;
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicException(pathname: string): boolean {
  return PUBLIC_EXCEPTIONS.some((exc) => pathname.startsWith(exc));
}

function getRequiredRoles(pathname: string): string[] | null {
  // Check most specific path first (longest prefix match)
  const sortedPaths = Object.keys(ROLE_REQUIREMENTS).sort(
    (a, b) => b.length - a.length
  );
  for (const path of sortedPaths) {
    if (pathname.startsWith(path)) {
      return ROLE_REQUIREMENTS[path];
    }
  }
  return null; // No specific role requirement — any authenticated user
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip non-protected routes and public exceptions
  if (!isProtectedRoute(pathname) || isPublicException(pathname)) {
    return NextResponse.next();
  }

  // 2. Extract JWT token from cookie
  const token = request.cookies.get("cm_auth_token")?.value;

  console.log(`[Middleware] Path: ${pathname}, Token present: ${!!token}`);

  if (!token) {
    console.log(`[Middleware] Redirecting to login: No token for ${pathname}`);
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify JWT signature and expiration
  const payload = await verifyToken(token);
  if (!payload) {
    console.log(`[Middleware] Redirecting to login: Token verification failed for ${pathname}`);
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("reason", "session_expired");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("cm_auth_token");
    return response;
  }

  // 4. Check role-based access
  const requiredRoles = getRequiredRoles(pathname);
  console.log(`[Middleware] Payload Role: ${payload.role}, Required Roles for ${pathname}: ${JSON.stringify(requiredRoles)}`);

  if (requiredRoles && !requiredRoles.includes(payload.role)) {
    console.log(`[Middleware] Role mismatch. Redirecting payload.role: ${payload.role}`);
    let redirectTarget = "/";
    switch (payload.role) {
      case "SUPERADMIN":
        redirectTarget = "/admin/super";
        break;
      case "COLLEGE_ADMIN":
        redirectTarget = "/dashboard/college";
        break;
      case "STUDENT":
        redirectTarget = "/dashboard/student";
        break;
      default:
        redirectTarget = "/";
    }

    const forbiddenUrl = new URL(redirectTarget, request.url);
    forbiddenUrl.searchParams.set("error", "access_denied");
    return NextResponse.redirect(forbiddenUrl);
  }

  // 5. Attach user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  if (payload.collegeId) {
    requestHeaders.set("x-college-id", payload.collegeId);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ============================================================
// Matcher Configuration
// ============================================================
// Only run middleware on routes that need protection.
// Excludes static assets, images, API routes (handled
// individually), and Next.js internals.
// ============================================================
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
  ],
};
