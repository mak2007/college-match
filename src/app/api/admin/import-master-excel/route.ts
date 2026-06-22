import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function verifySuperadmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_auth_token")?.value;
  if (!token) return false;
  const decoded = await verifyToken(token);
  return decoded !== null && decoded.role === "SUPERADMIN";
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperadmin();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate that it is an excel file
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json({ error: "Invalid file type. Only Excel (.xlsx, .xls) files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Paths to save
    const projectRoot = process.cwd();
    const excelName = "collegematch_ranked_2026-06-13 (3).xlsx";
    const rootPath = path.join(projectRoot, excelName);
    const templatesPath = path.join(projectRoot, "templates", excelName);

    // Save Excel file to both root and templates folder
    await writeFile(rootPath, buffer);
    await writeFile(templatesPath, buffer);

    console.log(`Saved master excel to ${rootPath} and ${templatesPath}`);

    // Execute the database import script
    const cmd = "npx tsx scratch/import_production_data.ts";
    console.log(`Executing: ${cmd} in ${projectRoot}`);
    
    const { stdout, stderr } = await execAsync(cmd, { cwd: projectRoot, timeout: 120000 });
    
    console.log("Master Excel import output:\n", stdout);
    if (stderr) {
      console.warn("Master Excel import stderr:\n", stderr);
    }

    return NextResponse.json({
      success: true,
      message: "Master Excel sheet uploaded and database re-import executed successfully.",
      output: stdout,
      errors: stderr || null
    });
  } catch (error: any) {
    console.error("Master Excel Import Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal Server Error",
      details: error.stderr || error.message
    }, { status: 500 });
  }
}
