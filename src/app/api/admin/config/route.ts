import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me_12345";

// Middleware-like verification helper
async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;
  if (!token) return false;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    return decoded && decoded.role === "SUPERADMIN";
  } catch (e) {
    return false;
  }
}

export async function GET() {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let config = await prisma.systemConfig.findUnique({
      where: { key: "matching_rules" },
    });

    // If config does not exist, auto-create it with default rules
    if (!config) {
      const defaultMatchingRules = {
        weightStrategy: "ROC",
        manualWeights: {
          PLACEMENTS: 0.30,
          ROI: 0.25,
          BRANCH_STRENGTH: 0.20,
          COLLEGE_LIFE: 0.15,
          CURRICULUM: 0.10,
        },
        budgetPenalty: {
          active: true,
          thresholdMultiplier: 1.3,
          basePenaltyWeight: 40.0,
          exponent: 2.0,
        },
        academicCompetitiveness: {
          active: true,
          safeThreshold: 5.0,
          reachThreshold: 0.0,
          unlikelyThreshold: -5.0,
          reachPenaltyScale: 3.0,
          unlikelyPenaltyScale: 5.0,
          excludeLimit: -15.0,
        },
        bonusRules: [
          { id: "placement_ex", type: "PLACEMENT_AVERAGE", threshold: 900000, bonus: 5.0, reason: "Placement average package exceeds ₹9 LPA" },
          { id: "partner_b", type: "IS_PARTNER", bonus: 2.0, reason: "Exclusive CollegeMatch Partner" }
        ],
        customScoringAttributes: [
          { key: "nirf_ranking", label: "NIRF Ranking Score", weight: 0.05, defaultValue: 70 },
          { key: "infra_rating", label: "Infrastructure Score", weight: 0.05, defaultValue: 80 }
        ]
      };

      config = await prisma.systemConfig.create({
        data: {
          key: "matching_rules",
          value: JSON.stringify(defaultMatchingRules, null, 2),
        },
      });
      console.log("Auto-created default matching rules configuration in GET handler.");
    }

    return NextResponse.json(JSON.parse(config.value));
  } catch (error: any) {
    console.error("GET System Config Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();

    // Basic structure validations
    if (!body.weightStrategy || !body.budgetPenalty || !body.academicCompetitiveness) {
      return NextResponse.json(
        { error: "Invalid configuration structure. Missing core settings." },
        { status: 400 }
      );
    }

    // Save to database
    await prisma.systemConfig.upsert({
      where: { key: "matching_rules" },
      update: {
        value: JSON.stringify(body, null, 2),
      },
      create: {
        key: "matching_rules",
        value: JSON.stringify(body, null, 2),
      },
    });

    return NextResponse.json({ success: true, message: "Matching configuration updated successfully" });
  } catch (error: any) {
    console.error("POST System Config Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
