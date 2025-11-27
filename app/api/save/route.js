import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "savedCode.json");

export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ language: "python", code: "" });
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Unable to load saved code" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { language, code } = await req.json();
    if (!language || code === undefined) {
      return NextResponse.json({ error: "language & code required" }, { status: 400 });
    }
    const toSave = { language, code };
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), "utf8");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
