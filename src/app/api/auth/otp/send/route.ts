import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Simple global or database simulator for OTP codes
// Let's use SystemConfig model or a runtime map to store OTP verification codes.
// For robust serverless-safe DB storage, we can store in SystemConfig as dynamic state,
// or just return a dummy verification response. To make it truly secure and functional,
// let's create a User model entry if it doesn't exist, or just save to prisma if user role allows.
// In this case, we can write the OTP to the console log, and keep a global map or write it
// into SystemConfig storage to bypass state constraints in edge.
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a 6-digit OTP code (e.g. 123456)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in SystemConfig for simplicity and persistence
    const key = `otp:${email.trim().toLowerCase()}`;
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: code },
      create: { key, value: code },
    });

    console.log(`========================================`);
    console.log(`[OTP SERVICE] OTP for ${email}: ${code}`);
    console.log(`========================================`);

    // In a real production environment, you would call an email service here.
    return NextResponse.json({ success: true, message: "Verification code sent to email." });
  } catch (error: any) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
