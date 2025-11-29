import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { code, language } = body;

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const prompt = `
Explain this ${language} code in simple steps:

${code}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();

    return NextResponse.json({
      explanation: data.choices?.[0]?.message?.content || "No explanation."
    });
  } catch (err) {
    return NextResponse.json({ error: err.toString() }, { status: 500 });
  }
}
