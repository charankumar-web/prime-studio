import { NextResponse } from "next/server";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const runtimeMap = {
  javascript: "node",
  python: "python3",
  c: "c",
  cpp: "cpp",
  java: "java"   // use "java" for EMKC piston; some endpoints accept "openjdk" or "java:17"
};

export async function POST(req) {
  try {
    const { language, code } = await req.json();
    if (!language || !code) return NextResponse.json({ error: "language & code required" }, { status: 400 });

    const runtime = runtimeMap[language];
    if (!runtime) return NextResponse.json({ error: "unsupported language" }, { status: 400 });

    const payload = {
      language: runtime,
      version: "*",
      files: [
        {
          name: language === 'java' ? 'Main.java' : 'code',
          content: code
        }
      ]
    };

    const pistonRes = await fetch(PISTON_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!pistonRes.ok) return NextResponse.json({ error: 'compiler unreachable' }, { status: 500 });

    const data = await pistonRes.json();
    const stdout = data.run?.stdout || '';
    const stderr = data.run?.stderr || '';
    const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');

    return NextResponse.json({ run: data.run, output: output || '(empty output)' });
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
