import { NextResponse } from "next/server";

// Piston API endpoint
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Runtime mapping for each language
const runtimeMap = {
  javascript: "node",
  python: "python3",
  c: "c",
  "c++": "cpp",
  java: "java"
};

// Safely decode URL-encoded or "+" encoded input
function safeDecode(input) {
  try {
    if (/%[0-9A-Fa-f]{2}/.test(input) || input.includes("+")) {
      return decodeURIComponent(input.replace(/\+/g, "%20"));
    }
    return input;
  } catch {
    return input;
  }
}

export async function POST(req) {
  try {
    // Read request body
    const body = await req.json();
    const language = body.language;
    let encoded = body.code;

    // Validate request
    if (!language || encoded === undefined) {
      return NextResponse.json(
        { error: "language & code are required" },
        { status: 400 }
      );
    }

    // Decode source code
    const rawCode = safeDecode(encoded);

    // Validate language runtime
    const runtime = runtimeMap[language];
    if (!runtime) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    // Select filename based on language
    let fileName = "code";
    if (language === "java") fileName = "Main.java";
    if (language === "c") fileName = "code.c";
    if (language === "c++") fileName = "code.cpp";
    if (language === "javascript") fileName = "code.js";
    if (language === "python") fileName = "code.py";

    // Inject wrapper class if Java code missing Main class
    let finalCode = rawCode;
    if (language === "java" && !rawCode.includes("class Main")) {
      finalCode = `public class Main {
    public static void main(String[] args) {
        ${rawCode}
    }
}`;
    }

    // Build Piston execution payload
    const payload = {
      language: runtime,
      version: "*",
      files: [{ name: fileName, content: finalCode }]
    };

    // Call Piston API
    const pistonRes = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Handle unreachable Piston server
    if (!pistonRes.ok) {
      return NextResponse.json(
        { error: "Compiler service unreachable" },
        { status: 500 }
      );
    }

    // Parse Piston response
    const data = await pistonRes.json();

    // Extract stdout/stderr
    const stdout = data.run?.stdout || "";
    const stderr = data.run?.stderr || "";

    // Format final output
    const outputRaw =
      stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
    const output = outputRaw.trim() || "(empty output)";

    // Return execution result
    return NextResponse.json({ run: data.run, output });

  } catch (err) {
    // Handle unexpected runtime errors
    return NextResponse.json(
      { error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
