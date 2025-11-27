import { NextResponse } from "next/server";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const runtimeMap = {
  javascript: "node",
  python: "python3",
  c: "c",
  "c++": "cpp",
  java: "java"
};

export async function POST(req) {
  try {
    const { language, code: rawCode } = await req.json();
    if (!language || !rawCode) {
      return NextResponse.json({ error: "language & code are required" }, { status: 400 });
    }
    const runtime = runtimeMap[language];
    if (!runtime) return NextResponse.json({ error: "Unsupported language" }, { status: 400 });

    let code = rawCode;
    let fileName = "code";
    if (language === "java") fileName = "Main.java";
    if (language === "c") fileName = "code.c";
    if (language === "c++") fileName = "code.cpp";
    if (language === "javascript") fileName = "code.js";
    if (language === "python") fileName = "code.py";

    if (language === "java" && !code.includes("class Main")) {
      code = `public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`;
    }

    const payload = { language: runtime, version: "*", files: [{ name: fileName, content: code }] };

    const pistonRes = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!pistonRes.ok) {
      return NextResponse.json({ error: "Compiler service unreachable" }, { status: 500 });
    }

    const data = await pistonRes.json();
    const stdout = data.run?.stdout || "";
    const stderr = data.run?.stderr || "";
    const outputRaw = (stdout || "") + (stderr ? `\n[stderr]\n${stderr}` : "");
    const output = outputRaw.trim() || "(empty output)";

    return NextResponse.json({ run: data.run, output });
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
