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
    // -------------------------------
    // 1️⃣ FIX: Decode encoded code
    // -------------------------------
    const { language, code: encoded } = await req.json();

    if (!language || encoded === undefined) {
      return NextResponse.json(
        { error: "language & code are required" },
        { status: 400 }
      );
    }

    // Important: decode safeCode from Deluge
    let rawCode = "";
    try {
      rawCode = decodeURIComponent(encoded);
    } catch (e) {
      rawCode = encoded; // fallback for frontend (raw text)
    }

    const runtime = runtimeMap[language];
    if (!runtime) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 }
      );
    }

    // -------------------------------
    // 2️⃣ FILE NAME HANDLING
    // -------------------------------
    let fileName = "code";

    if (language === "java") fileName = "Main.java";
    if (language === "c") fileName = "code.c";
    if (language === "c++") fileName = "code.cpp";
    if (language === "javascript") fileName = "code.js";
    if (language === "python") fileName = "code.py";

    // -------------------------------
    // 3️⃣ JAVA WRAPPER (required)
    // -------------------------------
    if (language === "java" && !rawCode.includes("class Main")) {
      rawCode = `public class Main {
    public static void main(String[] args) {
        ${rawCode}
    }
}`;
    }

    // -------------------------------
    // 4️⃣ PISTON PAYLOAD
    // -------------------------------
    const payload = {
      language: runtime,
      version: "*",
      files: [
        {
          name: fileName,
          content: rawCode // MUST BE DECODED CODE
        }
      ]
    };

    // -------------------------------
    // 5️⃣ SEND TO PISTON
    // -------------------------------
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

    // -------------------------------
    // 6️⃣ OUTPUT SAFE MERGE
    // -------------------------------
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
