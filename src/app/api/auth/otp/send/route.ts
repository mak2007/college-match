import { NextResponse } from "next/server";

// OTP authentication has been disabled.
// The platform now uses email + password authentication.
// See /api/auth/register (signup) and /api/auth/login (signin).

export async function POST() {
  return NextResponse.json(
    {
      error: "OTP authentication is disabled. Please use email + password to sign up or log in.",
      hint: "POST /api/auth/register for signup, POST /api/auth/login for login",
    },
    { status: 410 }
  );
}
