import { NextResponse } from "next/server";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const runtimeMap = {
  javascript: "node",
  python: "python3",
  c: "c",
  "c++": "cpp",
  java: "java"
};

function safeDecode(input) {
  try {
    // If string contains URL encoding like %2B %28 etc.
    if (/%[0-9A-Fa-f]{2}/.test(input) || input.includes("+")) {
      return decodeURIComponent(input.replace(/\+/g, "%20"));
    }
    return input; // Already raw
  } catch (e) {
    return input; // fallback
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const language = body.language;
    let encoded = body.code;

    if (!language || encoded === undefined) {
      return NextResponse.json(
        { error: "language & code are required" },
        { status: 400 }
      );
    }

    // 🟢 FINAL FIX: decode safely
    const rawCode = safeDecode(encoded);

    const runtime = runtimeMap[language];
    if (!runtime) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    let fileName = "code";

    if (language === "java") fileName = "Main.java";
    if (language === "c") fileName = "code.c";
    if (language === "c++") fileName = "code.cpp";
    if (language === "javascript") fileName = "code.js";
    if (language === "python") fileName = "code.py";

    // Java wrapper
    let finalCode = rawCode;
    if (language === "java" && !rawCode.includes("class Main")) {
      finalCode = `public class Main {
    public static void main(String[] args) {
        ${rawCode}
    }
}`;
    }

    // RUN ON PISTON
    const payload = {
      language: runtime,
      version: "*",
      files: [{ name: fileName, content: finalCode }]
    };

    const pistonRes = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!pistonRes.ok) {
      return NextResponse.json(
        { error: "Compiler service unreachable" },
        { status: 500 }
      );
    }

    const data = await pistonRes.json();

    const stdout = data.run?.stdout || "";
    const stderr = data.run?.stderr || "";
    const outputRaw =
      (stdout || "") + (stderr ? `\n[stderr]\n${stderr}` : "");
    const output = outputRaw.trim() || "(empty output)";

    return NextResponse.json({ run: data.run, output });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
